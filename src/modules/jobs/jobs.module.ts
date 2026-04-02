import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { QueuesModule } from 'src/modules/queues/queues.module';
import { Job } from 'src/modules/models/job.entity';
import { JobIntakeBootRecovery } from './job-intake-boot-recovery.service';
import { JobIntakeProcessingProcessor } from './processors/job-intake-processing.processor';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobIntakeAiService } from './services/job-intake-ai.service';

@Module({
  imports: [SequelizeModule.forFeature([Job]), AuthModule, QueuesModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobIntakeAiService,
    JobIntakeProcessingProcessor,
    JobIntakeBootRecovery,
  ],
  exports: [JobsService],
})
export class JobsModule {}
