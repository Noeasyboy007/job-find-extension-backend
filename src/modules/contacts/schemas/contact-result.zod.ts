import { z } from 'zod';

const nullableStr = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === undefined ? null : v));

const contactItemSchema = z.object({
  name: nullableStr,
  role: nullableStr,
  email: nullableStr,
  phone: nullableStr,
  linkedin_url: nullableStr,
  confidence: z.number().int().min(0).max(100),
  source_hint: nullableStr,
});

export const contactDiscoveryResultSchema = z.object({
  contacts: z
    .array(contactItemSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
});

export type ContactItem = z.infer<typeof contactItemSchema>;
export type ContactDiscoveryResult = z.infer<typeof contactDiscoveryResultSchema>;
