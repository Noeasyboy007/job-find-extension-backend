export const JOB_ANALYSIS_STATUS = [
  'queued',
  'processing',
  'completed',
  'failed',
] as const;

export type JobAnalysisStatus = (typeof JOB_ANALYSIS_STATUS)[number];
