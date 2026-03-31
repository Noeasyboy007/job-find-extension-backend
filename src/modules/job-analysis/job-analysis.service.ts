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
  JOB_ANALYSIS_JOBS,
} from 'src/common/constant/queues.constants';
import { JobAnalysis } from 'src/modules/models/job-analysis.entity';
import { Job } from 'src/modules/models/job.entity';
import { Resume } from 'src/modules/models/resume.entity';

export type JobAnalysisPublicDto = {
  id: number;
  job_id: number;
  user_id: number;
  status: string;
  fit_score: number | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class JobAnalysisService {
  private readonly logger = new Logger(JobAnalysisService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
    @InjectModel(Resume)
    private readonly resumeModel: typeof Resume,
    @InjectModel(JobAnalysis)
    private readonly jobAnalysisModel: typeof JobAnalysis,
    @InjectQueue(QUEUE_NAMES.JOB_ANALYSIS)
    private readonly jobAnalysisQueue: Queue,
  ) {}

  private async requireUserId(authorization?: string): Promise<number> {
    const me = await this.authService.me(authorization);
    return me.id as number;
  }

  private toDto(row: JobAnalysis): JobAnalysisPublicDto {
    const plain = row.get({ plain: true }) as unknown as Record<string, unknown>;
    return {
      id: plain.id as number,
      job_id: plain.job_id as number,
      user_id: plain.user_id as number,
      status: plain.status as string,
      fit_score: (plain.fit_score as number | null) ?? null,
      result: (plain.result as Record<string, unknown> | null) ?? null,
      error_message: (plain.error_message as string | null) ?? null,
      created_at: plain.createdAt as Date,
      updated_at: plain.updatedAt as Date,
    };
  }

  async getByJobId(
    authorization: string | undefined,
    jobId: number,
  ): Promise<JobAnalysisPublicDto | null> {
    const userId = await this.requireUserId(authorization);
    const job = await this.jobModel.findOne({
      where: { id: jobId, user_id: userId },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const row = await this.jobAnalysisModel.findOne({ where: { job_id: jobId } });
    if (!row) {
      return null;
    }
    if (row.user_id !== userId) {
      throw new NotFoundException('Job not found');
    }
    return this.toDto(row);
  }

  async enqueueAnalyze(
    authorization: string | undefined,
    jobId: number,
  ): Promise<JobAnalysisPublicDto> {
    const userId = await this.requireUserId(authorization);

    const job = await this.jobModel.findOne({
      where: { id: jobId, user_id: userId },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === 'processing' || job.status === 'captured') {
      throw new BadRequestException(
        'Job is not ready for analysis yet. Wait until structuring finishes.',
      );
    }
    if (job.status === 'failed') {
      throw new BadRequestException(
        'Job structuring failed. Fix or re-capture the job before running analysis.',
      );
    }

    const resume = await this.resumeModel.findOne({
      where: { user_id: userId, is_active: true },
    });
    if (!resume || resume.status !== 'parsed' || !resume.parsed_data) {
      throw new BadRequestException(
        'You need an active resume that has finished parsing before analyzing a job.',
      );
    }

    const [analysis] = await this.jobAnalysisModel.findOrCreate({
      where: { job_id: jobId },
      defaults: {
        user_id: userId,
        status: 'queued',
        fit_score: null,
        result: null,
        error_message: null,
      } as never,
    });

    if (analysis.user_id !== userId) {
      throw new NotFoundException('Job not found');
    }

    await analysis.update({
      status: 'queued',
      error_message: null,
      fit_score: null,
      result: null,
    });

    const bullJob = await this.jobAnalysisQueue.add(JOB_ANALYSIS_JOBS.ANALYZE, {
      jobId,
    });

    this.logger.log(
      `Enqueued ${JOB_ANALYSIS_JOBS.ANALYZE} bullJob id=${bullJob.id} for jobId=${jobId}`,
    );

    return this.toDto(await analysis.reload());
  }
}
