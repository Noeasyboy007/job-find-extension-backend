import { registerAs } from '@nestjs/config';

import { resumeParseProviderFromEnv } from 'src/common/constant/resume-parse-ai.constant';

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
      accessSecret: process.env.JWT_ACCESS_SECRET ,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiresInSeconds: Number(process.env.JWT_ACCESS_EXPIRES_IN_SECONDS), 
      refreshExpiresInSeconds: Number(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS) ,
      emailVerificationSecret: process.env.JWT_EMAIL_VERIFICATION_SECRET,
      emailVerificationExpiresInSeconds: Number(process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN_SECONDS),
      passwordResetSecret: process.env.JWT_PASSWORD_RESET_SECRET,
      passwordResetExpiresInSeconds: Number(process.env.JWT_PASSWORD_RESET_EXPIRES_IN_SECONDS),
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
      // Where the email link should point. Typically a frontend route that calls `POST /auth/verify`.
      urlBase:
        process.env.EMAIL_VERIFICATION_URL_BASE || 'http://localhost:5173/verify-email',
    },

    passwordReset: {
      // Where the email link should point. Typically a frontend route that calls `POST /auth/reset-password`.
      urlBase:
        process.env.PASSWORD_RESET_URL_BASE || 'http://localhost:5173/reset-password',
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

    ai: {
      /** 1 = OpenAI, 2 = Gemini — see `resume-parse-ai.constant.ts`. */
      resumeParseProvider: resumeParseProviderFromEnv(process.env.AI_RESUME_PARSE_PROVIDER),
      openai: {
        apiKey: (process.env.OPENAI_API_KEY ?? '').trim(),
        model: (process.env.OPENAI_MODEL ?? 'gpt-4o-mini').trim(),
      },
      gemini: {
        apiKey: (process.env.GEMINI_API_KEY ?? '').trim(),
        model: (process.env.GEMINI_MODEL ?? 'gemini-1.5-flash').trim(),
      },
    },

    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: (process.env.AWS_S3_REGION ),
      bucket: (process.env.AWS_S3_BUCKET || 'hirereach-resumes').trim(),
      /** Presigned GET URL lifetime for resume downloads (seconds). Max ~604800 (7 days). */
      presignExpiresSeconds: Math.min(
        Math.max(Number(process.env.AWS_S3_PRESIGN_EXPIRES_SECONDS) || 3600, 60),
        604800,
      ),
    },
  };
});
