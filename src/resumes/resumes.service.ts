import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import type { Queue } from 'bullmq';
import { Sequelize } from 'sequelize';

import { AuthService } from 'src/modules/auth/auth.service';
import { Resume } from 'src/modules/models/resume.entity';
import {
  QUEUE_NAMES,
  RESUME_PARSING_JOBS,
} from 'src/common/constant/queues.constants';
import {
  buildResumeObjectKey,
  buildS3ObjectPublicUrl,
  createS3Client,
  deleteObjectByKey,
  getPresignedGetObjectUrl,
  putObjectBuffer,
  type S3BucketConfig,
} from 'src/common/helpers/s3-bucket.helper';
import { RESUME_ALLOWED_MIME_TYPES, RESUME_STATUS } from 'src/common/constant/resume.constant';
import type { UpdateResumeDto } from './dto/update-resume.dto';
import type { ResumeStatus } from 'src/common/constant/resume.constant';

export type ResumePublicDto = {
  id: number;
  user_id: number;
  file_name: string;
  /** Time-limited S3 presigned GET URL (private buckets). Not the same as the canonical URL stored in DB. */
  file_url: string;
  file_type: string;
  file_size: number | null;
  status: string;
  is_active: boolean;
  parsed_data: Record<string, unknown> | null;
  raw_text: string | null;
  version: number;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    @InjectModel(Resume)
    private readonly resumeModel: typeof Resume,
    @InjectConnection()
    private readonly sequelize: Sequelize,
    @InjectQueue(QUEUE_NAMES.RESUME_PARSING)
    private readonly resumeParsningQueue: Queue,
  ) { }

  private getS3Config(): S3BucketConfig {
    const accessKeyId =
      this.configService.get<string>('app.s3.accessKeyId')?.trim() || '';
    const secretAccessKey =
      this.configService.get<string>('app.s3.secretAccessKey')?.trim() || '';
    const region =
      this.configService.get<string>('app.s3.region')?.trim() || 'ap-south-1';
    const bucket =
      this.configService.get<string>('app.s3.bucket')?.trim() || '';

    if (!accessKeyId || !secretAccessKey || !bucket) {
      throw new HttpException(
        'AWS S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { accessKeyId, secretAccessKey, region, bucket };
  }

  private assertAllowedMime(mimetype: string) {
    const ok = (RESUME_ALLOWED_MIME_TYPES as readonly string[]).includes(
      mimetype,
    );
    if (!ok) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${RESUME_ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private toResponse(row: Resume): ResumePublicDto {
    const plain = row.get({ plain: true }) as unknown as Record<string, unknown>;
    return {
      id: plain.id as number,
      user_id: plain.user_id as number,
      file_name: plain.file_name as string,
      file_url: plain.file_url as string,
      file_type: plain.file_type as string,
      file_size: (plain.file_size as number | null) ?? null,
      status: plain.status as string,
      is_active: plain.is_active as boolean,
      parsed_data: (plain.parsed_data as Record<string, unknown> | null) ?? null,
      raw_text: (plain.raw_text as string | null) ?? null,
      version: plain.version as number,
      error_message: (plain.error_message as string | null) ?? null,
      created_at: plain.createdAt as Date,
      updated_at: plain.updatedAt as Date,
    };
  }

  /** Maps entity → API DTO with a presigned `file_url` so browsers can open private objects. */
  private async toPublicDto(row: Resume): Promise<ResumePublicDto> {
    const dto = this.toResponse(row);
    const cfg = this.getS3Config();
    const client = createS3Client(cfg);
    const expiresIn =
      this.configService.get<number>('app.s3.presignExpiresSeconds') ?? 3600;
    const signed = await getPresignedGetObjectUrl(client, cfg.bucket, row.file_key, {
      expiresInSeconds: expiresIn,
      responseContentType: row.file_type || undefined,
    });
    return { ...dto, file_url: signed };
  }

  private async requireUserId(authorization?: string): Promise<number> {
    const me = await this.authService.me(authorization);
    return me.id as number;
  }

  async upload(
    authorization: string | undefined,
    file: Express.Multer.File,
    displayName?: string,
  ): Promise<ResumePublicDto> {
    const userId = await this.requireUserId(authorization);
    this.assertAllowedMime(file.mimetype);

    const cfg = this.getS3Config();
    const client = createS3Client(cfg);
    const originalName = file.originalname || 'resume';
    const key = buildResumeObjectKey(userId, originalName);
    const url = buildS3ObjectPublicUrl(cfg.bucket, cfg.region, key);

    await putObjectBuffer(
      client,
      cfg.bucket,
      key,
      file.buffer,
      file.mimetype,
    );

    const priorCount = await this.resumeModel.count({
      where: { user_id: userId },
    });
    const is_active = priorCount === 0;

    const row = await this.resumeModel.create(
      {
        user_id: userId,
        file_name: (displayName?.trim() || originalName).slice(0, 255),
        file_key: key,
        file_url: url,
        file_type: file.mimetype,
        file_size: file.size,
        status: RESUME_STATUS[0] as ResumeStatus,
        is_active: is_active as boolean,
        parsed_data: null ,
        raw_text: null,
        version: 1,
        error_message: null,
      } as never,
    );

    const parseJob = await this.resumeParsningQueue.add(RESUME_PARSING_JOBS.PARSE, { resumeId: row.id });
    this.logger.log(
      `Enqueued ${RESUME_PARSING_JOBS.PARSE} job id=${parseJob.id} for resumeId=${row.id} (Redis keys use prefix bull:${QUEUE_NAMES.RESUME_PARSING}:…)`,
    );

    return this.toPublicDto(row);
  }

  async findAll(authorization: string | undefined): Promise<ResumePublicDto[]> {
    const userId = await this.requireUserId(authorization);
    const rows = await this.resumeModel.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
    });
    return Promise.all(rows.map((r) => this.toPublicDto(r)));
  }

  async findOne(
    authorization: string | undefined,
    id: number,
  ): Promise<ResumePublicDto> {
    const userId = await this.requireUserId(authorization);
    const row = await this.resumeModel.findOne({
      where: { id, user_id: userId },
    });
    if (!row) {
      throw new NotFoundException('Resume not found');
    }
    return this.toPublicDto(row);
  }

  async update(
    authorization: string | undefined,
    id: number,
    dto: UpdateResumeDto,
  ): Promise<ResumePublicDto> {
    const userId = await this.requireUserId(authorization);
    const resume = await this.resumeModel.findOne({
      where: { id, user_id: userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const hasName = dto.file_name !== undefined;
    const hasActive = dto.is_active !== undefined;
    if (!hasName && !hasActive) {
      return this.toPublicDto(resume);
    }

    if (dto.file_name !== undefined) {
      const name = dto.file_name.trim();
      if (!name) {
        throw new BadRequestException('file_name cannot be empty');
      }
      resume.file_name = name.slice(0, 255);
    }

    await this.sequelize.transaction(async (t) => {
      if (dto.is_active === true) {
        await this.resumeModel.update(
          { is_active: false },
          { where: { user_id: userId }, transaction: t },
        );
        resume.is_active = true;
      } else if (dto.is_active === false) {
        resume.is_active = false;
      }
      await resume.save({ transaction: t });
    });

    return this.toPublicDto(await resume.reload());
  }

  async replaceFile(
    authorization: string | undefined,
    id: number,
    file: Express.Multer.File,
  ): Promise<ResumePublicDto> {
    const userId = await this.requireUserId(authorization);
    this.assertAllowedMime(file.mimetype);

    const resume = await this.resumeModel.findOne({
      where: { id, user_id: userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const cfg = this.getS3Config();
    const client = createS3Client(cfg);
    const originalName = file.originalname || 'resume';
    const newKey = buildResumeObjectKey(userId, originalName);
    const url = buildS3ObjectPublicUrl(cfg.bucket, cfg.region, newKey);
    const oldKey = resume.file_key;

    await putObjectBuffer(
      client,
      cfg.bucket,
      newKey,
      file.buffer,
      file.mimetype,
    );

    try {
      await deleteObjectByKey(client, cfg.bucket, oldKey);
    } catch (err) {
      this.logger.warn(
        `Failed to delete previous S3 object key=${oldKey}: ${String(err)}`,
      );
    }

    resume.file_name = originalName.slice(0, 255);
    resume.file_key = newKey;
    resume.file_url = url;
    resume.file_type = file.mimetype;
    resume.file_size = file.size;
    resume.status = RESUME_STATUS[0] as ResumeStatus;
    resume.parsed_data = null;
    resume.raw_text = null;
    resume.error_message = null;
    resume.version = resume.version + 1;
    await resume.save();

    const parseJob = await this.resumeParsningQueue.add(RESUME_PARSING_JOBS.PARSE, { resumeId: resume.id });
    this.logger.log(
      `Enqueued ${RESUME_PARSING_JOBS.PARSE} job id=${parseJob.id} for resumeId=${resume.id}`,
    );

    return this.toPublicDto(resume);
  }

  async remove(authorization: string | undefined, id: number): Promise<void> {
    const userId = await this.requireUserId(authorization);
    const resume = await this.resumeModel.findOne({
      where: { id, user_id: userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const cfg = this.getS3Config();
    const client = createS3Client(cfg);
    try {
      await deleteObjectByKey(client, cfg.bucket, resume.file_key);
    } catch (err) {
      this.logger.warn(
        `Failed to delete S3 object on resume delete key=${resume.file_key}: ${String(err)}`,
      );
    }

    await resume.destroy();
  }
}
