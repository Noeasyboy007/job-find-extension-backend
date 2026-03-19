import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export async function sendMail(params: {
  config: MailConfig;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const { config, to, subject, html, text } = params;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
    text,
  });
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export async function renderVerifyUserEmailHtml(params: {
  firstName: string;
  verificationLink: string;
}): Promise<string> {
  const { firstName, verificationLink } = params;

  const templatePath = path.join(
    process.cwd(),
    'src',
    'common',
    'email-templetes',
    'verify-user.html',
  );

  try {
    const template = await fs.readFile(templatePath, 'utf8');
    return applyTemplate(template, {
      firstName,
      verificationLink,
    });
  } catch {
    // Fallback template if the HTML file isn't found in the runtime environment.
    return `
<!doctype html>
<html><body>
  <p>Hi ${firstName},</p>
  <p>Please verify your email address by clicking the link below:</p>
  <p><a href="${verificationLink}">Verify Email</a></p>
  <p>If you didn’t request this, you can ignore this email.</p>
</body></html>
`.trim();
  }
}

export async function renderForgotPasswordEmailHtml(params: {
  firstName: string;
  resetLink: string;
}): Promise<string> {
  const { firstName, resetLink } = params;

  const templatePath = path.join(
    process.cwd(),
    'src',
    'common',
    'email-templetes',
    'forgot-password.html',
  );

  try {
    const template = await fs.readFile(templatePath, 'utf8');
    return applyTemplate(template, {
      firstName,
      resetLink,
    });
  } catch {
    return `
<!doctype html>
<html><body>
  <p>Hi ${firstName},</p>
  <p>We received a request to reset your password.</p>
  <p><a href="${resetLink}">Reset Password</a></p>
  <p>If you didn't request this, you can ignore this email.</p>
</body></html>
`.trim();
  }
}

export async function renderWelcomeEmailHtml(params: { firstName: string }): Promise<string> {
  const { firstName } = params;

  const templatePath = path.join(
    process.cwd(),
    'src',
    'common',
    'email-templetes',
    'welcome.html',
  );

  try {
    const template = await fs.readFile(templatePath, 'utf8');
    return applyTemplate(template, { firstName });
  } catch {
    return `
<!doctype html>
<html><body>
  <p>Hi ${firstName},</p>
  <p>Welcome to HireReach. Your email is verified and your account is now active.</p>
</body></html>
`.trim();
  }
}
