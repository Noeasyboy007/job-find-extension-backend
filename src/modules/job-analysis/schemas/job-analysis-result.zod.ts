import { z } from 'zod';

/** Structured output from the model (before attaching `meta`). */
export const jobAnalysisResultFromAiSchema = z.object({
  fit_score: z.number().int().min(0).max(100),
  summary: z.string(),
  strengths: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  gaps: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  recommendation: z.string(),
});

export type JobAnalysisResultFromAi = z.infer<typeof jobAnalysisResultFromAiSchema>;
