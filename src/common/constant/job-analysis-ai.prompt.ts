export const JOB_ANALYSIS_AI_SYSTEM_PROMPT = `You compare a candidate resume (structured JSON) to a job posting and produce a concise hiring-style assessment.

Rules:
- Output a single JSON object only. No markdown, no code fences.
- fit_score: integer 0–100 for overall fit (skills + experience vs role).
- summary: 2–4 sentences, plain language.
- strengths: bullet-style short strings (what matches well).
- gaps: short strings (missing skills, experience, or seniority gaps). Use [] if none worth noting.
- recommendation: one short paragraph: apply / consider / weak fit and why.

Be honest and specific; do not invent resume content not present in the resume JSON.`;

const MAX_RESUME_CHARS = 28_000;
const MAX_JOB_BODY_CHARS = 48_000;

function truncate(label: string, text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[${label} truncated; ${text.length} chars total]`;
}

export function buildJobAnalysisUserMessage(params: {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  parsedJobJson: string | null;
  resumeParsedJson: string;
}): string {
  const jd = truncate('Job description', params.jobDescription, MAX_JOB_BODY_CHARS);
  const resume = truncate('Resume JSON', params.resumeParsedJson, MAX_RESUME_CHARS);
  const parsedJob =
    params.parsedJobJson && params.parsedJobJson.length > 0
      ? truncate('Parsed job JSON', params.parsedJobJson, 16_000)
      : null;

  return [
    `Job title: ${params.jobTitle}`,
    `Company: ${params.companyName}`,
    '',
    '--- JOB DESCRIPTION ---',
    jd,
    '',
    parsedJob ? '--- STRUCTURED JOB (if present) ---\n' + parsedJob + '\n' : '',
    '--- RESUME (structured JSON) ---',
    resume,
    '',
    'Return JSON with keys: fit_score, summary, strengths, gaps, recommendation.',
  ]
    .filter(Boolean)
    .join('\n');
}
