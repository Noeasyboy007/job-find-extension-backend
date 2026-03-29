import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import type { Job } from 'bullmq';
import mammoth from 'mammoth';
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');

import { normalizeResumeText } from 'src/common/helpers/resume-text-normalize.helper';
import {
  createS3Client,
  getObjectBuffer,
  type S3BucketConfig,
} from 'src/common/helpers/s3-bucket.helper';
import { Resume } from 'src/modules/models/resume.entity';
import { ResumeParseAiService } from 'src/resumes/services/resume-parse-ai.service';
import {
  QUEUE_NAMES,
  RESUME_PARSING_JOBS,
  type ResumeParsningJobData,
} from 'src/common/constant/queues.constants';

@Processor(QUEUE_NAMES.RESUME_PARSING, {
  concurrency: 2,
})
export class ResumeParsningProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeParsningProcessor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly resumeParseAi: ResumeParseAiService,
    @InjectModel(Resume)
    private readonly resumeModel: typeof Resume,
  ) {
    super();
  }

  async process(job: Job<ResumeParsningJobData>): Promise<void> {
    const { resumeId } = job.data;

    if (job.name !== RESUME_PARSING_JOBS.PARSE) {
      this.logger.warn(`Unknown job name: ${job.name} — skipping`);
      return;
    }

    this.logger.log(`Processing resume parse job #${job.id} for resumeId=${resumeId}`);

    const resume = await this.resumeModel.findByPk(resumeId);
    if (!resume) {
      throw new Error(`Resume ${resumeId} not found — cannot parse`);
    }

    await resume.update({ status: 'processing', error_message: null });

    try {
      const fileBuffer = await this.downloadFromS3(resume.file_key);
      const rawText = await this.extractText(fileBuffer, resume.file_type);
      const normalized = normalizeResumeText(rawText);
      const parsedData = await this.resumeParseAi.parseStructuredResume(
        normalized,
        rawText.length,
      );

      await resume.update({
        status: 'parsed',
        raw_text: rawText,
        parsed_data: parsedData,
        error_message: null,
      });

      this.logger.log(
        `Resume ${resumeId} parsed successfully (${rawText.length} chars raw, ${normalized.length} normalized)`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Resume ${resumeId} parse failed: ${message}`);

      await resume.update({
        status: 'failed',
        error_message: message.slice(0, 500),
      });

      throw err;
    }
  }

  private getS3Config(): S3BucketConfig {
    return {
      accessKeyId: this.configService.get<string>('app.s3.accessKeyId')?.trim() ?? '',
      secretAccessKey: this.configService.get<string>('app.s3.secretAccessKey')?.trim() ?? '',
      region: this.configService.get<string>('app.s3.region')?.trim() ?? 'ap-south-1',
      bucket: this.configService.get<string>('app.s3.bucket')?.trim() ?? '',
    };
  }

  private async downloadFromS3(fileKey: string): Promise<Buffer> {
    const cfg = this.getS3Config();
    const client = createS3Client(cfg);
    return getObjectBuffer(client, cfg.bucket, fileKey);
  }

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const result = await pdfParse(buffer);
      return (result.text ?? '').trim();
    }

    if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value ?? '').trim();
    }

    throw new Error(`Unsupported file type for parsing: ${mimeType}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }
}
