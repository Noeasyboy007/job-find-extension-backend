export const QUEUE_NAMES = {
  RESUME_PARSING: 'resume-parsing',
  /** Normalize scraped job pages into structured JSON (post-intake). */
  JOB_INTAKE_PROCESSING: 'job-intake-processing',
  JOB_ANALYSIS: 'job-analysis',
  OUTREACH_GENERATION: 'outreach-generation',
  COMPANY_ENRICHMENT: 'company-enrichment',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const RESUME_PARSING_JOBS = {
  PARSE: 'parse',
} as const;

export type ResumeParsningJobData = {
  resumeId: number;
};

export const JOB_INTAKE_PROCESSING_JOBS = {
  STRUCTURE: 'structure',
} as const;

export type JobIntakeProcessingJobData = {
  jobId: number;
};

export const JOB_ANALYSIS_JOBS = {
  ANALYZE: 'analyze',
} as const;

export type JobAnalysisJobData = {
  jobId: number;
};

export const OUTREACH_GENERATION_JOBS = {
  GENERATE: 'generate',
} as const;

export type OutreachGenerationJobData = {
  outreachId: number;
};

export const COMPANY_ENRICHMENT_JOBS = {
  ENRICH: 'enrich',
} as const;
