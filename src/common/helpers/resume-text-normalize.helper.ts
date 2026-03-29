export function normalizeResumeText(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/[\t ]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/[ \u00a0]+\n/g, '\n');
  t = t.replace(/\n[ \u00a0]+/g, '\n');
  return t.trim();
}
