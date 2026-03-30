import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/sequelize';
import type { Queue } from 'bullmq';
import { col, fn, Op, where } from 'sequelize';

import { AuthService } from 'src/modules/auth/auth.service';
import { Job } from 'src/modules/models/job.entity';
import type { JobStatus } from 'src/common/constant/job.constant';
import {
  QUEUE_NAMES,
  JOB_INTAKE_PROCESSING_JOBS,
} from 'src/common/constant/queues.constants';
import type { CreateJobDto } from './dto/create-job.dto';
import type { UpdateJobStatusDto } from './dto/update-job-status.dto';

export type JobPublicDto = {
  id: number;
  user_id: number;
  title: string;
  company_name: string;
  location: string | null;
  work_mode: string | null;
  work_time: string | null;
  salary: string | null;
  source_platform: string;
  source_url: string | null;
  description: string;
  employment_type: string | null;
  experience_level: string | null;
  skills: string[];
  raw_payload: Record<string, unknown> | null;
  extracted_metadata: Record<string, unknown> | null;
  parsed_job: Record<string, unknown> | null;
  error_message: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
    @InjectQueue(QUEUE_NAMES.JOB_INTAKE_PROCESSING)
    private readonly jobIntakeQueue: Queue,
  ) {}

  private toResponse(row: Job): JobPublicDto {
    const plain = row.get({ plain: true }) as unknown as Record<string, unknown>;
    return {
      id: plain.id as number,
      user_id: plain.user_id as number,
      title: plain.title as string,
      company_name: plain.company_name as string,
      location: (plain.location as string | null) ?? null,
      work_mode: (plain.work_mode as string | null) ?? null,
      work_time: (plain.work_time as string | null) ?? null,
      salary: (plain.salary as string | null) ?? null,
      source_platform: plain.source_platform as string,
      source_url: (plain.source_url as string | null) ?? null,
      description: plain.description as string,
      employment_type: (plain.employment_type as string | null) ?? null,
      experience_level: (plain.experience_level as string | null) ?? null,
      skills: Array.isArray(plain.skills)
        ? (plain.skills as string[]).filter((s) => typeof s === 'string')
        : [],
      raw_payload: (plain.raw_payload as Record<string, unknown> | null) ?? null,
      extracted_metadata:
        (plain.extracted_metadata as Record<string, unknown> | null) ?? null,
      parsed_job: (plain.parsed_job as Record<string, unknown> | null) ?? null,
      error_message: (plain.error_message as string | null) ?? null,
      status: plain.status as string,
      created_at: plain.createdAt as Date,
      updated_at: plain.updatedAt as Date,
    };
  }

  private async requireUserId(authorization?: string): Promise<number> {
    const me = await this.authService.me(authorization);
    return me.id as number;
  }

  private normalizeOptionalString(value?: string): string | null {
    if (value === undefined || value === null) return null;
    const t = value.trim();
    return t.length ? t : null;
  }

  private normalizeRequiredString(value: string): string {
    return (value ?? '').trim();
  }

  private async enqueueStructureIfNeeded(jobId: number): Promise<void> {
    const structureJob = await this.jobIntakeQueue.add(
      JOB_INTAKE_PROCESSING_JOBS.STRUCTURE,
      { jobId },
    );
    this.logger.log(
      `Enqueued ${JOB_INTAKE_PROCESSING_JOBS.STRUCTURE} job id=${structureJob.id} for jobId=${jobId} (queue ${QUEUE_NAMES.JOB_INTAKE_PROCESSING})`,
    );
  }

  private normalizeSkills(value?: string[]): string[] | null {
    if (!value?.length) return null;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of value) {
      if (typeof raw !== 'string') continue;
      const t = raw.trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t.slice(0, 150));
    }
    return out.length ? out : null;
  }

  async intake(
    authorization: string | undefined,
    dto: CreateJobDto,
  ): Promise<JobPublicDto> {
    const userId = await this.requireUserId(authorization);

    const title = this.normalizeRequiredString(dto.title).slice(0, 500);
    const company = this.normalizeRequiredString(dto.company_name).slice(0, 500);
    const sourceUrl = this.normalizeOptionalString(dto.source_url);

    // Best path: if caller provides a job id, update that specific record.
    if (dto.id) {
      const existingById = await this.jobModel.findOne({
        where: { id: dto.id, user_id: userId },
      });
      if (existingById) {
        existingById.title = title;
        existingById.company_name = company;
        existingById.location = this.normalizeOptionalString(dto.location);
        existingById.work_mode = this.normalizeOptionalString(dto.work_mode);
        existingById.work_time = this.normalizeOptionalString(dto.work_time);
        existingById.salary = this.normalizeOptionalString(dto.salary);
        existingById.source_platform = dto.source_platform as never;
        existingById.source_url = sourceUrl;
        existingById.description = this.normalizeRequiredString(dto.description).slice(
          0,
          500000,
        );
        existingById.employment_type = this.normalizeOptionalString(
          dto.employment_type,
        );
        existingById.experience_level = this.normalizeOptionalString(
          dto.experience_level,
        );
        existingById.skills = this.normalizeSkills(dto.skills);
        existingById.raw_payload = dto.raw_payload ?? null;
        existingById.extracted_metadata = dto.extracted_metadata ?? null;
        // keep parsed_job/error_message as-is
        await existingById.save();
        return this.toResponse(await existingById.reload());
      }
      // If id provided but not found, fall back to de-dupe/create path.
    }

    // De-dupe: same user + (source_url OR case-insensitive title+company).
    const dedupeOr: unknown[] = [];
    if (sourceUrl) {
      dedupeOr.push({
        user_id: userId,
        source_url: sourceUrl,
      });
    }
    dedupeOr.push({
      user_id: userId,
      [Op.and]: [
        where(fn('lower', col('title')), title.toLowerCase()),
        where(fn('lower', col('company_name')), company.toLowerCase()),
      ],
    });

    const existing = await this.jobModel.findOne({
      // paranoid table => soft-deleted rows won't match
      where: { [Op.or]: dedupeOr } as never,
      order: [['createdAt', 'DESC']],
    });

    if (existing) {
      // Optionally enrich existing record with any missing info.
      const nextSalary = this.normalizeOptionalString(dto.salary);
      const nextLocation = this.normalizeOptionalString(dto.location);
      const nextWorkMode = this.normalizeOptionalString(dto.work_mode);
      const nextWorkTime = this.normalizeOptionalString(dto.work_time);
      const nextEmployment = this.normalizeOptionalString(dto.employment_type);
      const nextExperience = this.normalizeOptionalString(dto.experience_level);
      const nextSkills = this.normalizeSkills(dto.skills);
      const nextDesc = this.normalizeRequiredString(dto.description);

      let changed = false;
      if (!existing.source_url && sourceUrl) {
        existing.source_url = sourceUrl;
        changed = true;
      }
      if (!existing.salary && nextSalary) {
        existing.salary = nextSalary;
        changed = true;
      }
      if (!existing.location && nextLocation) {
        existing.location = nextLocation;
        changed = true;
      }
      if (!existing.work_mode && nextWorkMode) {
        existing.work_mode = nextWorkMode;
        changed = true;
      }
      if (!existing.work_time && nextWorkTime) {
        existing.work_time = nextWorkTime;
        changed = true;
      }
      if (!existing.employment_type && nextEmployment) {
        existing.employment_type = nextEmployment;
        changed = true;
      }
      if (!existing.experience_level && nextExperience) {
        existing.experience_level = nextExperience;
        changed = true;
      }
      if ((!existing.skills || !existing.skills.length) && nextSkills?.length) {
        existing.skills = nextSkills;
        changed = true;
      }
      if (nextDesc.length > (existing.description?.length ?? 0) + 50) {
        existing.description = nextDesc.slice(0, 500000);
        changed = true;
      }

      if (changed) {
        await existing.save();
      }

      // If we never structured it, ensure we enqueue once.
      if (!existing.parsed_job && existing.status !== 'processing') {
        await this.enqueueStructureIfNeeded(existing.id);
      }

      return this.toResponse(await existing.reload());
    }

    const row = await this.jobModel.create({
      user_id: userId,
      title,
      company_name: company,
      location: this.normalizeOptionalString(dto.location),
      work_mode: this.normalizeOptionalString(dto.work_mode),
      work_time: this.normalizeOptionalString(dto.work_time),
      salary: this.normalizeOptionalString(dto.salary),
      source_platform: dto.source_platform,
      source_url: sourceUrl,
      description: this.normalizeRequiredString(dto.description).slice(0, 500000),
      employment_type: this.normalizeOptionalString(dto.employment_type),
      experience_level: this.normalizeOptionalString(dto.experience_level),
      skills: this.normalizeSkills(dto.skills),
      raw_payload: dto.raw_payload ?? null,
      extracted_metadata: dto.extracted_metadata ?? null,
      parsed_job: null,
      error_message: null,
    } as never);

    await this.enqueueStructureIfNeeded(row.id);
    return this.toResponse(row);
  }

  async findAll(authorization: string | undefined): Promise<JobPublicDto[]> {
    const userId = await this.requireUserId(authorization);
    const rows = await this.jobModel.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
    });
    return rows.map((r) => this.toResponse(r));
  }

  async findOne(
    authorization: string | undefined,
    id: number,
  ): Promise<JobPublicDto> {
    const userId = await this.requireUserId(authorization);
    const row = await this.jobModel.findOne({
      where: { id, user_id: userId },
    });
    if (!row) {
      throw new NotFoundException('Job not found');
    }
    return this.toResponse(row);
  }

  async updateStatus(
    authorization: string | undefined,
    id: number,
    dto: UpdateJobStatusDto,
  ): Promise<JobPublicDto> {
    const userId = await this.requireUserId(authorization);
    const row = await this.jobModel.findOne({
      where: { id, user_id: userId },
    });
    if (!row) {
      throw new NotFoundException('Job not found');
    }
    row.status = dto.status as JobStatus;
    await row.save();
    return this.toResponse(await row.reload());
  }
}
