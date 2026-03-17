import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {

  return {
    port: Number(process.env.APP_PORT) || 5050,
    nodeEnv: process.env.NODE_ENV || 'development',

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
  };
});