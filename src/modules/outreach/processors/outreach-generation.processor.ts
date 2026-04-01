import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Job as BullJob } from 'bullmq';

import {
  QUEUE_NAMES,
  OUTREACH_GENERATION_JOBS,
  type OutreachGenerationJobData,
} from 'src/common/constant/queues.constants';
import { OutreachMessage } from 'src/modules/models/outreach-message.entity';
import { Job } from 'src/modules/models/job.entity';
import { JobAnalysis } from 'src/modules/models/job-analysis.entity';
import { Resume } from 'src/modules/models/resume.entity';
import { OutreachAiService } from '../services/outreach-ai.service';
import type { OutreachMessageType } from 'src/common/constant/outreach.constant';

@Processor(QUEUE_NAMES.OUTREACH_GENERATION, {
  concurrency: 2,
})
export class OutreachGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(OutreachGenerationProcessor.name);

  constructor(
    private readonly outreachAi: OutreachAiService,
    @InjectModel(OutreachMessage)
    private readonly outreachModel: typeof OutreachMessage,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
    @InjectModel(JobAnalysis)
    private readonly jobAnalysisModel: typeof JobAnalysis,
    @InjectModel(Resume)
    private readonly resumeModel: typeof Resume,
  ) {
    super();
  }

  async process(bullJob: BullJob<OutreachGenerationJobData>): Promise<void> {
    const { outreachId } = bullJob.data;

    if (bullJob.name !== OUTREACH_GENERATION_JOBS.GENERATE) {
      this.logger.warn(`Unknown job name: ${bullJob.name} — skipping`);
      return;
    }

    this.logger.log(`Outreach generation #${bullJob.id} for outreachId=${outreachId}`);

    const outreach = await this.outreachModel.findByPk(outreachId);
    if (!outreach) {
      throw new Error(`OutreachMessage ${outreachId} not found`);
    }

    await outreach.update({ generation_status: 'processing', error_message: null });

    const job = await this.jobModel.findByPk(outreach.job_id);
    if (!job) {
      const msg = `Job ${outreach.job_id} not found`;
      await outreach.update({ generation_status: 'failed', error_message: msg });
      return;
    }

    const analysis = await this.jobAnalysisModel.findOne({
      where: { job_id: outreach.job_id },
    });
    if (!analysis || analysis.status !== 'completed' || !analysis.result) {
      const msg =
        'Job analysis must be completed before generating outreach. Run the match analysis first.';
      await outreach.update({ generation_status: 'failed', error_message: msg });
      return;
    }

    const resume = await this.resumeModel.findOne({
      where: { user_id: outreach.user_id, is_active: true },
    });
    if (!resume || resume.status !== 'parsed' || !resume.parsed_data) {
      const msg =
        'Active parsed resume is required for outreach generation.';
      await outreach.update({ generation_status: 'failed', error_message: msg });
      return;
    }

    try {
      const message = await this.outreachAi.generateMessage({
        type: outreach.type as OutreachMessageType,
        jobTitle: job.title,
        companyName: job.company_name,
        jobDescription: job.description ?? '',
        analysisJson: JSON.stringify(analysis.result),
        resumeParsedJson: JSON.stringify(resume.parsed_data),
        contactName: outreach.contact_name ?? null,
        contactRole: outreach.contact_role ?? null,
      });

      await outreach.update({
        generation_status: 'completed',
        content: message,
        error_message: null,
      });

      this.logger.log(`Outreach ${outreachId} generated (type=${outreach.type})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Outreach ${outreachId} failed: ${message}`);
      await outreach.update({
        generation_status: 'failed',
        error_message: message.slice(0, 2000),
      });
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: BullJob, error: Error) {
    this.logger.error(
      `BullJob ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: BullJob) {
    this.logger.log(`BullJob ${job.id} (${job.name}) completed`);
  }
}
