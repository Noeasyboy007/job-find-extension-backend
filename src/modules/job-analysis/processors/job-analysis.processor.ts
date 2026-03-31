import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Job as BullJob } from 'bullmq';

import {
  QUEUE_NAMES,
  JOB_ANALYSIS_JOBS,
  type JobAnalysisJobData,
} from 'src/common/constant/queues.constants';
import { JobAnalysis } from 'src/modules/models/job-analysis.entity';
import { Job } from 'src/modules/models/job.entity';
import { Resume } from 'src/modules/models/resume.entity';
import { JobAnalysisAiService } from '../services/job-analysis-ai.service';
import type { JobAnalysisResultFromAi } from '../schemas/job-analysis-result.zod';

@Processor(QUEUE_NAMES.JOB_ANALYSIS, {
  concurrency: 2,
})
export class JobAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(JobAnalysisProcessor.name);

  constructor(
    private readonly jobAnalysisAi: JobAnalysisAiService,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
    @InjectModel(Resume)
    private readonly resumeModel: typeof Resume,
    @InjectModel(JobAnalysis)
    private readonly jobAnalysisModel: typeof JobAnalysis,
  ) {
    super();
  }

  async process(job: BullJob<JobAnalysisJobData>): Promise<void> {
    const { jobId } = job.data;

    if (job.name !== JOB_ANALYSIS_JOBS.ANALYZE) {
      this.logger.warn(`Unknown job name: ${job.name} — skipping`);
      return;
    }

    this.logger.log(`Job analysis #${job.id} for jobId=${jobId}`);

    const row = await this.jobModel.findByPk(jobId);
    if (!row) {
      throw new Error(`Job ${jobId} not found`);
    }

    const resume = await this.resumeModel.findOne({
      where: { user_id: row.user_id, is_active: true },
    });

    if (!resume || resume.status !== 'parsed' || !resume.parsed_data) {
      const msg =
        'Active resume with parsed data is required. Upload a resume and wait for parsing to finish.';
      await this.markFailed(jobId, row.user_id, msg);
      return;
    }

    let analysis = await this.jobAnalysisModel.findOne({ where: { job_id: jobId } });
    if (!analysis) {
      analysis = await this.jobAnalysisModel.create({
        job_id: jobId,
        user_id: row.user_id,
        status: 'processing',
        fit_score: null,
        result: null,
        error_message: null,
      } as never);
    } else {
      await analysis.update({
        status: 'processing',
        error_message: null,
      });
    }

    const resumeJson = JSON.stringify(resume.parsed_data);
    const parsedJobJson = row.parsed_job ? JSON.stringify(row.parsed_job) : null;

    try {
      const result = await this.jobAnalysisAi.analyzeMatch({
        jobTitle: row.title,
        companyName: row.company_name,
        jobDescription: row.description ?? '',
        parsedJobJson,
        resumeParsedJson: resumeJson,
      });

      const structured = result as JobAnalysisResultFromAi & {
        meta: Record<string, unknown>;
      };
      const fitScore = structured.fit_score;

      await analysis.update({
        status: 'completed',
        fit_score: fitScore,
        result: result as Record<string, unknown>,
        error_message: null,
      });

      await row.update({ status: 'analyzed' });

      this.logger.log(`Job ${jobId} analyzed (fit_score=${fitScore})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${jobId} analysis failed: ${message}`);

      await analysis.update({
        status: 'failed',
        error_message: message.slice(0, 2000),
      });

      throw err;
    }
  }

  private async markFailed(jobId: number, userId: number, message: string): Promise<void> {
    let analysis = await this.jobAnalysisModel.findOne({ where: { job_id: jobId } });
    if (!analysis) {
      analysis = await this.jobAnalysisModel.create({
        job_id: jobId,
        user_id: userId,
        status: 'failed',
        fit_score: null,
        result: null,
        error_message: message.slice(0, 2000),
      } as never);
    } else {
      await analysis.update({
        status: 'failed',
        error_message: message.slice(0, 2000),
      });
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: BullJob, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: BullJob) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }
}
