import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { AuthService } from 'src/modules/auth/auth.service';
import { Job } from 'src/modules/models/job.entity';
import type { JobStatus } from 'src/common/constant/job.constant';
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
  status: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class JobsService {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
  ) { }

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

    const row = await this.jobModel.create(
      {
        user_id: userId,
        title: dto.title.trim(),
        company_name: dto.company_name.trim(),
        location: this.normalizeOptionalString(dto.location),
        work_mode: this.normalizeOptionalString(dto.work_mode),
        work_time: this.normalizeOptionalString(dto.work_time),
        salary: this.normalizeOptionalString(dto.salary),
        source_platform: dto.source_platform,
        source_url: this.normalizeOptionalString(dto.source_url),
        description: dto.description.trim(),
        employment_type: this.normalizeOptionalString(dto.employment_type),
        experience_level: this.normalizeOptionalString(dto.experience_level),
        skills: this.normalizeSkills(dto.skills),
        raw_payload: dto.raw_payload ?? null,
        extracted_metadata: dto.extracted_metadata ?? null,
      } as never,
    );

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
