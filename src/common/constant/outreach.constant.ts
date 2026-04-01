export const OUTREACH_MESSAGE_TYPE = [
  'recruiter',
  'founder',
  'connection_request',
] as const;

export type OutreachMessageType = (typeof OUTREACH_MESSAGE_TYPE)[number];

export const OUTREACH_GENERATION_STATUS = [
  'queued',
  'processing',
  'completed',
  'failed',
] as const;

export type OutreachGenerationStatus = (typeof OUTREACH_GENERATION_STATUS)[number];

export const OUTREACH_MESSAGE_STATUS = [
  'draft',
  'sent',
  'replied',
  'archived',
] as const;

export type OutreachMessageStatus = (typeof OUTREACH_MESSAGE_STATUS)[number];
