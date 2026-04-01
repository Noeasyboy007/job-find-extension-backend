export const CONTACT_ROLE_TYPE = [
  'hr',
  'recruiter',
  'hiring_manager',
  'founder',
  'ceo',
  'cto',
  'other',
] as const;

export type ContactRoleType = (typeof CONTACT_ROLE_TYPE)[number];
