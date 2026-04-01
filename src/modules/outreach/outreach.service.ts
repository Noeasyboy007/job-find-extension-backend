import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/sequelize';
import type { Queue } from 'bullmq';

import { AuthService } from 'src/modules/auth/auth.service';
import {
  QUEUE_NAMES,
  OUTREACH_GENERATION_JOBS,
} from 'src/common/constant/queues.constants';
import type { OutreachMessageType, OutreachMessageStatus } from 'src/common/constant/outreach.constant';
import { OutreachMessage } from 'src/modules/models/outreach-message.entity';
import { Job } from 'src/modules/models/job.entity';
import { JobAnalysis } from 'src/modules/models/job-analysis.entity';
import { JobContact } from 'src/modules/models/job-contact.entity';
import type { GenerateOutreachDto } from './dto/generate-outreach.dto';
import type { UpdateOutreachDto } from './dto/update-outreach.dto';

export type OutreachPublicDto = {
  id: number;
  job_id: number;
  user_id: number;
  type: string;
  generation_status: string;
  status: string;
  content: string | null;
  contact_id: number | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class OutreachService {
  private readonly logger = new Logger(OutreachService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectModel(OutreachMessage)
    private readonly outreachModel: typeof OutreachMessage,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
    @InjectModel(JobAnalysis)
    private readonly jobAnalysisModel: typeof JobAnalysis,
    @InjectModel(JobContact)
    private readonly jobContactModel: typeof JobContact,
    @InjectQueue(QUEUE_NAMES.OUTREACH_GENERATION)
    private readonly outreachQueue: Queue,
  ) {}

  private async requireUserId(authorization?: string): Promise<number> {
    const me = await this.authService.me(authorization);
    return me.id as number;
  }

  private toDto(row: OutreachMessage): OutreachPublicDto {
    const plain = row.get({ plain: true }) as unknown as Record<string, unknown>;
    return {
      id: plain.id as number,
      job_id: plain.job_id as number,
      user_id: plain.user_id as number,
      type: plain.type as string,
      generation_status: plain.generation_status as string,
      status: plain.status as string,
      content: (plain.content as string | null) ?? null,
      contact_id: (plain.contact_id as number | null) ?? null,
      contact_name: (plain.contact_name as string | null) ?? null,
      contact_role: (plain.contact_role as string | null) ?? null,
      contact_email: (plain.contact_email as string | null) ?? null,
      error_message: (plain.error_message as string | null) ?? null,
      created_at: plain.createdAt as Date,
      updated_at: plain.updatedAt as Date,
    };
  }

  async generate(
    authorization: string | undefined,
    dto: GenerateOutreachDto,
  ): Promise<OutreachPublicDto> {
    const userId = await this.requireUserId(authorization);

    const job = await this.jobModel.findOne({
      where: { id: dto.jobId, user_id: userId },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const analysis = await this.jobAnalysisModel.findOne({
      where: { job_id: dto.jobId },
    });
    if (!analysis || analysis.status !== 'completed') {
      throw new BadRequestException(
        'Job analysis must be completed before generating outreach. Run the match analysis first.',
      );
    }

    let contactId: number | null = null;
    let contactName: string | null = null;
    let contactRole: string | null = null;
    let contactEmail: string | null = null;

    if (dto.contactId) {
      const contact = await this.jobContactModel.findOne({
        where: { id: dto.contactId, job_id: dto.jobId, user_id: userId },
      });
      if (!contact) {
        throw new NotFoundException('Contact not found or does not belong to this job');
      }
      contactId = contact.id;
      contactName = contact.name ?? null;
      contactRole = contact.role ?? null;
      contactEmail = contact.email ?? null;
    }

    const row = await this.outreachModel.create({
      user_id: userId,
      job_id: dto.jobId,
      type: dto.type as OutreachMessageType,
      generation_status: 'queued',
      status: 'draft',
      content: null,
      contact_id: contactId,
      contact_name: contactName,
      contact_role: contactRole,
      contact_email: contactEmail,
      error_message: null,
    } as never);

    const bullJob = await this.outreachQueue.add(OUTREACH_GENERATION_JOBS.GENERATE, {
      outreachId: row.id,
    });

    this.logger.log(
      `Enqueued outreach generation bullJob id=${bullJob.id} for outreachId=${row.id} (type=${dto.type})`,
    );

    return this.toDto(row);
  }

  async findAllForJob(
    authorization: string | undefined,
    jobId: number,
  ): Promise<OutreachPublicDto[]> {
    const userId = await this.requireUserId(authorization);

    const job = await this.jobModel.findOne({ where: { id: jobId, user_id: userId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const rows = await this.outreachModel.findAll({
      where: { job_id: jobId, user_id: userId },
      order: [['createdAt', 'DESC']],
    });

    return rows.map((r) => this.toDto(r));
  }

  async findOne(
    authorization: string | undefined,
    id: number,
  ): Promise<OutreachPublicDto> {
    const userId = await this.requireUserId(authorization);
    const row = await this.outreachModel.findOne({ where: { id, user_id: userId } });
    if (!row) {
      throw new NotFoundException('Outreach message not found');
    }
    return this.toDto(row);
  }

  async update(
    authorization: string | undefined,
    id: number,
    dto: UpdateOutreachDto,
  ): Promise<OutreachPublicDto> {
    const userId = await this.requireUserId(authorization);
    const row = await this.outreachModel.findOne({ where: { id, user_id: userId } });
    if (!row) {
      throw new NotFoundException('Outreach message not found');
    }

    const updates: Partial<{
      content: string;
      status: OutreachMessageStatus;
    }> = {};

    if (dto.content !== undefined) {
      updates.content = dto.content;
    }
    if (dto.status !== undefined) {
      updates.status = dto.status as OutreachMessageStatus;
    }

    if (Object.keys(updates).length > 0) {
      await row.update(updates);
    }

    return this.toDto(await row.reload());
  }
}
