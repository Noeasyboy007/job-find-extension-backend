import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import { promises as dns } from 'dns';

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

  // Many local/dev networks don't have working IPv6 routes for SMTP.
  // Resolve to IPv4 first and preserve TLS host validation via servername.
  let smtpHost = config.host;
  let tlsServername: string | undefined;
  try {
    const ipv4 = await dns.lookup(config.host, { family: 4 });
    smtpHost = ipv4.address;
    tlsServername = config.host;
  } catch {
    // Fallback to original host when IPv4 lookup is unavailable.
    smtpHost = config.host;
  }

  const sendWith = async (mailOptions: { port: number; secure: boolean }) => {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: mailOptions.port,
      secure: mailOptions.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: tlsServername ? { servername: tlsServername } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text,
    });
  };

  try {
    await sendWith({ port: config.port, secure: config.secure });
  } catch (error: any) {
    const rawMessage = error?.message ? String(error.message) : '';
    const isTlsMismatch =
      rawMessage.toLowerCase().includes('wrong version number') ||
      rawMessage.toLowerCase().includes('ssl routines');

    // Retry once with a common alternate TLS mode.
    if (isTlsMismatch) {
      const fallback = config.secure
        ? { secure: false, port: 587 }
        : { secure: true, port: 465 };
      try {
        await sendWith(fallback);
        return;
      } catch {
        // fall through and throw original formatted error below
      }
    }

    const code = error?.code ? ` code=${String(error.code)}` : '';
    const errno = error?.errno ? ` errno=${String(error.errno)}` : '';
    const command = error?.command ? ` command=${String(error.command)}` : '';
    const message = error?.message ? String(error.message) : 'Unknown mail error';
    throw new Error(`Mail send failed:${code}${errno}${command} message=${message}`);
  }
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

export async function renderPasswordChangedEmailHtml(params: {
  firstName: string;
}): Promise<string> {
  const { firstName } = params;

  const templatePath = path.join(
    process.cwd(),
    'src',
    'common',
    'email-templetes',
    'password-changed.html',
  );

  try {
    const template = await fs.readFile(templatePath, 'utf8');
    return applyTemplate(template, { firstName });
  } catch {
    return `
<!doctype html>
<html><body>
  <p>Hi ${firstName},</p>
  <p>Your password was changed successfully.</p>
  <p>If this was not you, please reset your password immediately.</p>
</body></html>
`.trim();
  }
}

export async function renderPasswordResetSuccessEmailHtml(params: {
  firstName: string;
}): Promise<string> {
  const { firstName } = params;

  const templatePath = path.join(
    process.cwd(),
    'src',
    'common',
    'email-templetes',
    'password-reset-success.html',
  );

  try {
    const template = await fs.readFile(templatePath, 'utf8');
    return applyTemplate(template, { firstName });
  } catch {
    return `
<!doctype html>
<html><body>
  <p>Hi ${firstName},</p>
  <p>Your password has been reset successfully.</p>
  <p>If this was not you, please secure your account immediately.</p>
</body></html>
`.trim();
  }
}
