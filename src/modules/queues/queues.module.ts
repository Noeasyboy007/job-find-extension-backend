import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { QUEUE_NAMES } from '../../common/constant/queues.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('app.redis.host') ?? '127.0.0.1',
          port: config.get<number>('app.redis.port') ?? 6379,
          password: config.get<string | undefined>('app.redis.password'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.RESUME_PARSING },
      { name: QUEUE_NAMES.JOB_ANALYSIS },
      { name: QUEUE_NAMES.OUTREACH_GENERATION },
      { name: QUEUE_NAMES.COMPANY_ENRICHMENT },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule { }
