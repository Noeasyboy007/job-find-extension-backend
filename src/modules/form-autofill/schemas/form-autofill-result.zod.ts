import { z } from 'zod';

const fillSchema = z.object({
  field_key: z.string(),
  value: z.string(),
});

export const formAutofillResultFromAiSchema = z.object({
  fills: z
    .array(fillSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
});

export type FormAutofillFill = z.infer<typeof fillSchema>;
