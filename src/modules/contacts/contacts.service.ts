import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { AuthService } from 'src/modules/auth/auth.service';
import { JobContact } from 'src/modules/models/job-contact.entity';
import { Job } from 'src/modules/models/job.entity';
import { ContactDiscoveryAiService } from './services/contact-discovery-ai.service';

export type JobContactPublicDto = {
  id: number;
  job_id: number;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  confidence: number;
  source_hint: string | null;
  created_at: Date;
};

export type DiscoverContactsResponse = {
  job_id: number;
  contacts: JobContactPublicDto[];
  /** True when returning previously cached contacts instead of re-running AI. */
  from_cache: boolean;
};

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
    @InjectModel(JobContact)
    private readonly jobContactModel: typeof JobContact,
    private readonly contactDiscoveryAi: ContactDiscoveryAiService,
  ) {}

  private async requireUserId(authorization?: string): Promise<number> {
    const me = await this.authService.me(authorization);
    return me.id as number;
  }

  private toDto(row: JobContact): JobContactPublicDto {
    const plain = row.get({ plain: true }) as unknown as Record<string, unknown>;
    return {
      id: plain.id as number,
      job_id: plain.job_id as number,
      name: (plain.name as string | null) ?? null,
      role: (plain.role as string | null) ?? null,
      email: (plain.email as string | null) ?? null,
      phone: (plain.phone as string | null) ?? null,
      linkedin_url: (plain.linkedin_url as string | null) ?? null,
      confidence: plain.confidence as number,
      source_hint: (plain.source_hint as string | null) ?? null,
      created_at: plain.createdAt as Date,
    };
  }

  async discoverContacts(
    authorization: string | undefined,
    jobId: number,
  ): Promise<DiscoverContactsResponse> {
    const userId = await this.requireUserId(authorization);

    const job = await this.jobModel.findOne({
      where: { id: jobId, user_id: userId },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Return cached contacts if already discovered.
    const existing = await this.jobContactModel.findAll({
      where: { job_id: jobId, user_id: userId },
      order: [['confidence', 'DESC']],
    });
    if (existing.length > 0) {
      this.logger.log(`Contact cache hit for jobId=${jobId} (${existing.length} contacts)`);
      return {
        job_id: jobId,
        contacts: existing.map((r) => this.toDto(r)),
        from_cache: true,
      };
    }

    this.logger.log(`Running contact discovery for jobId=${jobId}`);
    const items = await this.contactDiscoveryAi.discoverContacts({
      jobTitle: job.title,
      companyName: job.company_name,
      sourcePlatform: job.source_platform,
      sourceUrl: job.source_url,
      jobDescription: job.description ?? '',
      parsedJobJson: job.parsed_job ? JSON.stringify(job.parsed_job) : null,
    });

    if (!items.length) {
      this.logger.log(`No contacts found in jobId=${jobId}`);
      return { job_id: jobId, contacts: [], from_cache: false };
    }

    const created = await Promise.all(
      items.map((item) =>
        this.jobContactModel.create({
          job_id: jobId,
          user_id: userId,
          name: item.name ?? null,
          role: item.role ?? null,
          email: item.email ?? null,
          phone: item.phone ?? null,
          linkedin_url: item.linkedin_url ?? null,
          confidence: item.confidence,
          source_hint: item.source_hint ?? null,
        } as never),
      ),
    );

    this.logger.log(`Saved ${created.length} contacts for jobId=${jobId}`);
    return {
      job_id: jobId,
      contacts: created.map((r) => this.toDto(r)),
      from_cache: false,
    };
  }

  async getContactsForJob(
    authorization: string | undefined,
    jobId: number,
  ): Promise<JobContactPublicDto[]> {
    const userId = await this.requireUserId(authorization);

    const job = await this.jobModel.findOne({ where: { id: jobId, user_id: userId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const rows = await this.jobContactModel.findAll({
      where: { job_id: jobId, user_id: userId },
      order: [['confidence', 'DESC']],
    });
    return rows.map((r) => this.toDto(r));
  }
}
