export const RESUME_STATUS = [
    'uploaded',
    'processing',
    'parsed',
    'failed',
] as const;

export type ResumeStatus = (typeof RESUME_STATUS)[number];

export const RESUME_MAX_FILE_BYTES = 3 * 1024 * 1024;

export const RESUME_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type ResumeAllowedMimeType = (typeof RESUME_ALLOWED_MIME_TYPES)[number];

/** Magic-number validation in Nest FileTypeValidator; skip for Office MIME diversity. */
export const RESUME_FILE_TYPE_VALIDATOR_REGEX =
    /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;