export const RESUME_PARSE_AI_PROVIDER = {
  OPENAI: 1,
  GEMINI: 2,
} as const;

export type ResumeParseAiProviderId =
  (typeof RESUME_PARSE_AI_PROVIDER)[keyof typeof RESUME_PARSE_AI_PROVIDER];

export function resumeParseProviderFromEnv(value: string | undefined): 1 | 2 {
  const n = Number(String(value ?? '1').trim());
  if (n === RESUME_PARSE_AI_PROVIDER.GEMINI) {
    return RESUME_PARSE_AI_PROVIDER.GEMINI;
  }
  return RESUME_PARSE_AI_PROVIDER.OPENAI;
}
