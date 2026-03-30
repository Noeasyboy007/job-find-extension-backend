import { z } from 'zod';

const nullableStr = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === undefined ? null : v));

const stringArray = z
  .array(z.string())
  .nullable()
  .optional()
  .transform((v) => v ?? []);

/**
 * Mirrors titled blocks on the job page. A block may be prose-only (paragraph),
 * bullets-only, or both—like “About us” + paragraph, then “Why join us?” + list.
 */
const descriptionSectionSchema = z.object({
  heading: nullableStr,
  paragraph: nullableStr,
  bullets: stringArray,
});

const descriptionSectionsArray = z
  .array(descriptionSectionSchema)
  .nullable()
  .optional()
  .transform((v) => v ?? []);

/** Model output before `meta` is attached in the AI service. */
export const parsedJobFromAiSchema = z.object({
  title: nullableStr,
  company_name: nullableStr,
  location: nullableStr,
  work_mode: nullableStr,
  employment_type: nullableStr,
  experience_level: nullableStr,
  salary_range: nullableStr,
  summary: nullableStr,
  /** “About the company / about us / who we are” narrative (1–3 short paragraphs as one string). */
  about_company: nullableStr,
  /** Role-specific intro: what the job is, product context, “you will…” prose under the title. */
  role_overview: nullableStr,
  /** “Team & reporting”, “who you’ll work with”, reporting lines — one bullet per line. */
  team_reporting: stringArray,
  /** Time zones, async expectations, hours, travel, work authorization — prose. */
  logistics_notes: nullableStr,
  /** Role / day-to-day bullets (from “Responsibilities”, “What you’ll do”, etc.). */
  responsibilities: stringArray,
  /** Must-haves: education, years, certifications, hard gates. */
  requirements: stringArray,
  /** Preferred / bonus / nice-to-have bullets. */
  nice_to_have: stringArray,
  /** Distinct tools, languages, frameworks, platforms (deduped). */
  skills: stringArray,
  benefits: stringArray,
  /**
   * Optional: preserve the posting’s section headings and bullet lists in display order,
   * when the page is clearly organized into blocks.
   */
  description_sections: descriptionSectionsArray,
  seniority_hint: nullableStr,
});

export type ParsedJobFromAi = z.infer<typeof parsedJobFromAiSchema>;
