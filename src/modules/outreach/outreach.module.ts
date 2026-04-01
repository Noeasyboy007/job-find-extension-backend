import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { QueuesModule } from 'src/modules/queues/queues.module';
import { OutreachMessage } from 'src/modules/models/outreach-message.entity';
import { Job } from 'src/modules/models/job.entity';
import { JobAnalysis } from 'src/modules/models/job-analysis.entity';
import { Resume } from 'src/modules/models/resume.entity';
import { JobContact } from 'src/modules/models/job-contact.entity';
import { OutreachGenerationProcessor } from './processors/outreach-generation.processor';
import { OutreachAiService } from './services/outreach-ai.service';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';

@Module({
  imports: [
    SequelizeModule.forFeature([OutreachMessage, Job, JobAnalysis, Resume, JobContact]),
    AuthModule,
    QueuesModule,
  ],
  controllers: [OutreachController],
  providers: [OutreachService, OutreachAiService, OutreachGenerationProcessor],
})
export class OutreachModule {}
