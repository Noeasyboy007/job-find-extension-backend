export const JOB_SOURCE_PLATFORM = [
  'linkedin',
  'indeed',
  'glassdoor',
  'apna',
  'well_found',
  'career_page',
  'manual',
] as const;

export type JobSourcePlatform = (typeof JOB_SOURCE_PLATFORM)[number];

export const JOB_STATUS = [
  'captured',
  'ready_for_analysis',
  'analyzed',
  'failed',
] as const;

export type JobStatus = (typeof JOB_STATUS)[number];
