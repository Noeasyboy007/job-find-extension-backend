const MAX_RESUME_JSON = 10_000;
const MAX_PROFILE_JSON = 4_000;
const MAX_FIELDS_JSON = 24_000;

function truncate(label: string, text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n[${label} truncated at ${max} chars]`;
}

export const FORM_AUTOFILL_AI_SYSTEM_PROMPT = `You map job application form fields to a candidate's data for HireReach.

You receive THREE data sources:
1. STRUCTURED RESUME — parsed CV data (skills, experience, education, projects, etc.)
2. JOB APPLY PROFILE — supplemental profile data the user explicitly saved: CTC, notice period, location, LinkedIn URL, preferred locations, work mode, etc. ALWAYS prefer this data over resume data for these fields.
3. FORM FIELDS — the visible input/select/textarea elements on the application page.

CRITICAL RULES:
- Use ONLY information from the two data sources. Do NOT invent employers, dates, degrees, salaries, or contact details.
- Every field_key in your output MUST be copied verbatim from the FORM FIELDS list. Never invent field_key values.
- If you cannot map a field confidently, OMIT it from "fills" (do not output empty strings).
- For <select> fields: the value MUST match exactly one of the option strings listed (format "value|Label"). Use the value part (before |). If unsure, omit.
- For radio button groups: use "true" / the matching value ONLY when the label clearly matches data you have.
- For checkbox fields: use "true" or "false" only when clearly answerable from the data.
- For CTC / salary fields: prefer the JOB APPLY PROFILE values. Convert to numbers only (no currency symbols unless the field label asks for it).
- For notice period: prefer notice_period_label from the apply profile if present; otherwise compute from notice_period_days (0 = Immediate).
- For location fields (city / state / country / pincode): prefer JOB APPLY PROFILE current_city, current_state, current_country, current_pincode.
- For LinkedIn/GitHub/portfolio URLs: prefer JOB APPLY PROFILE values.
- For "preferred location" multi-select or radio fields: use preferred_locations from the apply profile.
- For phone/email: use resume or profile data only when present.
- Keep text values concise unless the field clearly expects a paragraph (e.g. cover letter or "describe yourself").

Output ONE valid JSON object only. No markdown, no code fences.
Format: { "fills": Array<{ "field_key": string, "value": string }> }`;

export function buildFormAutofillUserMessage(params: {
  resumeParsedJson: string;
  applyProfileJson: string | null;
  fieldsJson: string;
}): string {
  const resume = truncate('Resume JSON', params.resumeParsedJson, MAX_RESUME_JSON);
  const fields = truncate('Fields JSON', params.fieldsJson, MAX_FIELDS_JSON);

  const lines: string[] = [
    'Data sources and form fields below.',
    'Each field has field_key (copy verbatim), tagName, type, name, id, label, placeholder, and optionally options for <select>.',
    '',
    '--- 1. STRUCTURED RESUME (parsed CV) ---',
    resume,
  ];

  if (params.applyProfileJson) {
    const profile = truncate('Apply profile JSON', params.applyProfileJson, MAX_PROFILE_JSON);
    lines.push(
      '',
      '--- 2. JOB APPLY PROFILE (user-saved supplemental data — higher priority for CTC, location, notice period, URLs) ---',
      profile,
    );
  } else {
    lines.push('', '--- 2. JOB APPLY PROFILE ---', '(not set — use resume data only)');
  }

  lines.push(
    '',
    '--- 3. FORM FIELDS (fill targets) ---',
    fields,
    '',
    'Return JSON: { "fills": [ { "field_key": "...", "value": "..." } ] }',
  );

  return lines.join('\n');
}
