import { registerAs } from '@nestjs/config';

function asBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  const normalized = value.trim().replace(/^["']|["']$/g, '').toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return defaultValue;
}

export default registerAs('app', () => {

  return {
    port: Number(process.env.APP_PORT) || 5050,
    nodeEnv: process.env.NODE_ENV || 'development',

    jwt: {
      // Use strong secrets in production; these defaults are for local dev only.
      accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
      accessExpiresInSeconds: Number(process.env.JWT_ACCESS_EXPIRES_IN_SECONDS) || 900, // 15m
      refreshExpiresInSeconds: Number(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS) || 604800, // 7d
      emailVerificationSecret: process.env.JWT_EMAIL_VERIFICATION_SECRET || 'dev_email_verify_secret_change_me',
      emailVerificationExpiresInSeconds: Number(process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS) || 86400, // 1d
      passwordResetSecret: process.env.JWT_PASSWORD_RESET_SECRET || 'dev_password_reset_secret_change_me',
      passwordResetExpiresInSeconds: Number(process.env.JWT_PASSWORD_RESET_EXPIRES_IN_SECONDS) || 3600, // 1h
    },

    mail: {
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: asBoolean(process.env.MAIL_SECURE, false),
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || '',
      from: process.env.MAIL_FROM || process.env.MAIL_USER || '',
    },

    emailVerification: {
      // Where the email link should point. Default points to this backend verify API.
      urlBase:
        process.env.EMAIL_VERIFICATION_URL_BASE || 'http://localhost:5050/api/v1/auth/verify',
    },

    passwordReset: {
      // Where the email link should point. Typically a frontend route that calls `POST /auth/reset-password`.
      urlBase:
        process.env.PASSWORD_RESET_URL_BASE || 'http://localhost:5050/api/v1/auth/reset-password',
    },

    db: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'find_jobs',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      logging: process.env.DB_LOGGING === 'true',
      sync: process.env.DB_SYNC === 'true',
      alert: process.env.DB_ALERT === 'true',
    },

    redis: {
      host: (process.env.REDIS_HOST || '127.0.0.1').trim(),
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD?.trim() || undefined,
    },

    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: (process.env.AWS_S3_REGION || process.env.AWS_REGION || 'ap-south-1').trim(),
      bucket: (process.env.AWS_S3_BUCKET || 'hirereach-resumes').trim(),
    },
  };
});