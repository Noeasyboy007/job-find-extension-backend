import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Job as BullJob } from 'bullmq';

import { normalizeResumeText } from 'src/common/helpers/resume-text-normalize.helper';
import {
  QUEUE_NAMES,
  JOB_INTAKE_PROCESSING_JOBS,
  type JobIntakeProcessingJobData,
} from 'src/common/constant/queues.constants';
import { Job } from 'src/modules/models/job.entity';
import { JobIntakeAiService } from 'src/modules/jobs/services/job-intake-ai.service';
import type { JobIntakeScrapeHints } from 'src/common/constant/job-intake-ai.prompt';
import type { ParsedJobFromAi } from 'src/modules/jobs/schemas/parsed-job.zod';

const MAX_DESCRIPTION_CHARS_FOR_MODEL = 48_000;

@Processor(QUEUE_NAMES.JOB_INTAKE_PROCESSING, {
  concurrency: 2,
})
export class JobIntakeProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(JobIntakeProcessingProcessor.name);

  constructor(
    private readonly jobIntakeAi: JobIntakeAiService,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
  ) {
    super();
  }

  async process(job: BullJob<JobIntakeProcessingJobData>): Promise<void> {
    const { jobId } = job.data;

    if (job.name !== JOB_INTAKE_PROCESSING_JOBS.STRUCTURE) {
      this.logger.warn(`Unknown job name: ${job.name} — skipping`);
      return;
    }

    this.logger.log(`Processing job-intake structure #${job.id} for jobId=${jobId}`);

    const row = await this.jobModel.findByPk(jobId);
    if (!row) {
      throw new Error(`Job ${jobId} not found — cannot structure`);
    }

    await row.update({ status: 'processing', error_message: null });

    const rawDescription = row.description ?? '';
    const sourceLen = rawDescription.length;
    const normalized = normalizeResumeText(rawDescription).slice(0, MAX_DESCRIPTION_CHARS_FOR_MODEL);

    const hints: JobIntakeScrapeHints = {
      title: row.title,
      company_name: row.company_name,
      location: row.location,
      work_mode: row.work_mode,
      work_time: row.work_time,
      salary: row.salary,
      employment_type: row.employment_type,
      experience_level: row.experience_level,
      source_platform: row.source_platform,
      skills: Array.isArray(row.skills)
        ? row.skills.filter((s): s is string => typeof s === 'string')
        : [],
    };

    try {
      const parsedJob = await this.jobIntakeAi.parseStructuredJob(
        hints,
        normalized,
        sourceLen,
      );

      const structured = parsedJob as ParsedJobFromAi & {
        meta: Record<string, unknown>;
      };

      const mergedSkills = this.mergeSkillLists(row.skills, structured.skills);

      await row.update({
        status: 'ready_for_analysis',
        parsed_job: parsedJob as Record<string, unknown>,
        error_message: null,
        title: this.pickRequiredStr(structured.title, row.title),
        company_name: this.pickRequiredStr(structured.company_name, row.company_name),
        location: this.pickNullableStr(structured.location, row.location),
        work_mode: this.pickNullableStr(structured.work_mode, row.work_mode),
        employment_type: this.pickNullableStr(
          structured.employment_type,
          row.employment_type,
        ),
        experience_level: this.pickNullableStr(
          structured.experience_level,
          row.experience_level,
        ),
        salary: this.pickNullableStr(structured.salary_range, row.salary),
        skills: mergedSkills.length ? mergedSkills : null,
      });

      this.logger.log(
        `Job ${jobId} structured successfully (description ${sourceLen} chars in, ${normalized.length} chars to model)`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${jobId} structure failed: ${message}`);

      await row.update({
        status: 'failed',
        error_message: message.slice(0, 500),
      });

      throw err;
    }
  }

  private pickRequiredStr(ai: string | null | undefined, fallback: string): string {
    if (typeof ai === 'string') {
      const t = ai.trim();
      if (t.length > 0) return t.slice(0, 500);
    }
    return fallback;
  }

  private pickNullableStr(
    ai: string | null | undefined,
    fallback: string | null,
  ): string | null {
    if (typeof ai === 'string') {
      const t = ai.trim();
      if (t.length > 0) return t.slice(0, 500);
    }
    return fallback;
  }

  private mergeSkillLists(
    existing: string[] | null,
    fromAi: string[] | undefined,
  ): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t.slice(0, 150));
    };
    for (const s of existing ?? []) {
      if (typeof s === 'string') add(s);
    }
    for (const s of fromAi ?? []) {
      if (typeof s === 'string') add(s);
    }
    return out;
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
