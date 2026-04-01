import { z } from 'zod';

export const outreachResultFromAiSchema = z.object({
  message: z.string().min(1),
});

export type OutreachResultFromAi = z.infer<typeof outreachResultFromAiSchema>;
