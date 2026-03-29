import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import type { Job } from 'bullmq';
import mammoth from 'mammoth';
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');

import {
  createS3Client,
  getObjectBuffer,
  type S3BucketConfig,
} from 'src/common/helpers/s3-bucket.helper';
import { Resume } from 'src/modules/models/resume.entity';
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
      const parsedData = this.buildParsedData(rawText);

      await resume.update({
        status: 'parsed',
        raw_text: rawText,
        parsed_data: parsedData,
        error_message: null,
      });

      this.logger.log(`Resume ${resumeId} parsed successfully (${rawText.length} chars)`);
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

  /**
   * Lightweight section extraction from plain text.
   * A dedicated AI parse step (phase 2) will replace this with structured extraction.
   */
  private buildParsedData(rawText: string): Record<string, unknown> {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const emailMatch = rawText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = rawText.match(/[\+\d][\d\s\-().]{7,}/);

    const sectionHeaders = [
      'experience', 'education', 'skills', 'projects',
      'certifications', 'summary', 'objective', 'awards',
    ];
    const sections: Record<string, string[]> = {};
    let currentSection = 'header';

    for (const line of lines) {
      const lower = line.toLowerCase();
      const matched = sectionHeaders.find((h) => lower.startsWith(h));
      if (matched) {
        currentSection = matched;
        sections[currentSection] = sections[currentSection] ?? [];
      } else {
        sections[currentSection] = sections[currentSection] ?? [];
        sections[currentSection].push(line);
      }
    }

    return {
      email: emailMatch?.[0] ?? null,
      phone: phoneMatch?.[0]?.trim() ?? null,
      sections,
      char_count: rawText.length,
      line_count: lines.length,
      parsed_at: new Date().toISOString(),
    };
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
