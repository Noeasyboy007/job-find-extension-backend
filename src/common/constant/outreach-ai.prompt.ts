import type { OutreachMessageType } from './outreach.constant';

export const OUTREACH_AI_SYSTEM_PROMPT = `You are a writing assistant for HireReach, a job-search tool.

## WHO IS WRITING — WHO IS READING
The JOB SEEKER is the AUTHOR of every message. They are writing to someone at the company.
The RECRUITER / HR / FOUNDER / CEO is the RECIPIENT — the person who will receive and read this message.

NEVER write as if the company is contacting the candidate. The candidate is reaching OUT to the company.

## Output format
Output ONE valid JSON object only. No markdown, no code fences.
Format: { "message": string }

## Message type guidelines

recruiter (candidate → HR or Recruiter):
- 3–5 sentences.
- Opening: greet the recipient by first name if known (e.g. "Hi Sarah,"), otherwise use "Hi there," — NEVER address the candidate's own name in the greeting.
- The candidate introduces themselves: "I'm [Candidate Name], a [brief role/title]…"
- Name the specific role and company. Reference 1–2 matching strengths from the analysis.
- End with a soft open question ("Would you be open to a quick chat?" / "Happy to share more — does that work?").
- Do NOT mention fit scores, AI tools, or ask them to review a resume in the message.

founder (candidate → Founder or CEO):
- 4–6 sentences.
- Open by greeting the founder/CEO by first name if known.
- Candidate introduces themselves briefly.
- Reference the company mission or product specifically (from the job description).
- Connect the candidate's strongest matching strength to what they are building.
- Express genuine enthusiasm for the mission — no generic flattery.
- Close with a soft ask for a conversation.

connection_request (candidate → anyone on LinkedIn):
- Under 300 characters total (LinkedIn strict limit).
- Natural and human, not salesy.
- Who the candidate is + the role or company briefly + invite to connect.
- No hashtags, no links.

## Tone rules
- Always write in first person from the candidate's perspective ("I am…", "My background…", "I'd love to…").
- The greeting line is addressed TO the recipient, not to the candidate.
- Sign off with the candidate's first name if available in the resume.
- Never beg or apologise for reaching out.
- Be specific: company name, role title, one concrete matching strength.
- Specific > generic every time.`;

const MAX_RESUME_CHARS = 8_000;
const MAX_JD_CHARS = 16_000;
const MAX_ANALYSIS_CHARS = 4_000;

function truncate(label: string, text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n[${label} truncated at ${max} chars]`;
}

export function buildOutreachUserMessage(params: {
  type: OutreachMessageType;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  analysisJson: string;
  resumeParsedJson: string;
  contactName?: string | null;
  contactRole?: string | null;
}): string {
  const jd = truncate('Job description', params.jobDescription, MAX_JD_CHARS);
  const analysis = truncate('Analysis', params.analysisJson, MAX_ANALYSIS_CHARS);
  const resume = truncate('Resume', params.resumeParsedJson, MAX_RESUME_CHARS);

  const typeLabels: Record<OutreachMessageType, string> = {
    recruiter: 'Recruiter / HR (cold outreach)',
    founder: 'Founder / CEO (cold outreach)',
    connection_request: 'LinkedIn connection request note (< 300 chars)',
  };

  // Try to pull the candidate's name from the parsed resume JSON for the prompt hint.
  let candidateName = '';
  try {
    const parsed = JSON.parse(params.resumeParsedJson) as Record<string, unknown>;
    const name =
      (parsed['name'] as string | undefined) ??
      (parsed['full_name'] as string | undefined) ??
      ((parsed['personal_info'] as Record<string, unknown> | undefined)?.['name'] as string | undefined);
    if (name && typeof name === 'string') candidateName = name.trim();
  } catch {
    /* ignore */
  }

  const lines: string[] = [
    `Message type: ${typeLabels[params.type]}`,
    `The job: ${params.jobTitle} at ${params.companyName}`,
    '',
    `AUTHOR (the person sending this message): ${candidateName || 'the job seeker — extract their name from the resume below'}`,
  ];

  if (params.contactName) {
    lines.push(
      `RECIPIENT (the person who will READ this message): ${params.contactName}${params.contactRole ? ` — ${params.contactRole}` : ''}`,
      `Open the message with: "Hi ${params.contactName.split(' ')[0]},"`,
    );
  } else {
    lines.push(
      `RECIPIENT: Unknown — use "Hi there," as the opening greeting.`,
    );
  }

  lines.push(
    '',
    '--- JOB DESCRIPTION ---',
    jd,
    '',
    '--- RESUME / JOB MATCH ANALYSIS ---',
    analysis,
    '',
    '--- CANDIDATE RESUME (structured JSON) — the author\'s background ---',
    resume,
    '',
    'Write the message now FROM the candidate TO the recipient. Return JSON: { "message": string }',
  );

  return lines.join('\n');
}
