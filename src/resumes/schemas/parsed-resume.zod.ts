import { z } from 'zod';

const nullableStr = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === undefined ? null : v));

const contactSchema = z.object({
  email: nullableStr,
  phone: nullableStr,
  location: nullableStr,
  linkedin: nullableStr,
  github: nullableStr,
  website: nullableStr,
});

const experienceItemSchema = z.object({
  company: nullableStr,
  title: nullableStr,
  location: nullableStr,
  start_date: nullableStr,
  end_date: nullableStr,
  is_current: z.boolean().optional().default(false),
  highlights: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
});

const educationItemSchema = z.object({
  institution: nullableStr,
  degree: nullableStr,
  field: nullableStr,
  start_year: nullableStr,
  end_year: nullableStr,
  honors: nullableStr,
});

const projectItemSchema = z.object({
  name: nullableStr,
  description: nullableStr,
  url: nullableStr,
  technologies: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
});

/** What we expect from the model (before we attach meta). */
export const parsedResumeFromAiSchema = z.object({
  full_name: nullableStr,
  headline: nullableStr,
  summary: nullableStr,
  contact: contactSchema.optional().default({
    email: null,
    phone: null,
    location: null,
    linkedin: null,
    github: null,
    website: null,
  }),
  skills: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  experience: z
    .array(experienceItemSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  education: z
    .array(educationItemSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  certifications: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  languages: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  projects: z
    .array(projectItemSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
});

export type ParsedResumeFromAi = z.infer<typeof parsedResumeFromAiSchema>;

export const parsedResumeMetaSchema = z.object({
  parsed_at: z.string(),
  provider: z.enum(['openai', 'gemini']),
  model: z.string(),
  source_char_count: z.number().optional(),
});

export type ParsedResumeMeta = z.infer<typeof parsedResumeMetaSchema>;
