import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { QueuesModule } from 'src/modules/queues/queues.module';
import { JobAnalysis } from 'src/modules/models/job-analysis.entity';
import { Job } from 'src/modules/models/job.entity';
import { Resume } from 'src/modules/models/resume.entity';
import { JobAnalysisProcessor } from './processors/job-analysis.processor';
import { JobAnalysisAiService } from './services/job-analysis-ai.service';
import { JobAnalysisController } from './job-analysis.controller';
import { JobAnalysisService } from './job-analysis.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Job, Resume, JobAnalysis]),
    AuthModule,
    QueuesModule,
  ],
  controllers: [JobAnalysisController],
  providers: [JobAnalysisService, JobAnalysisAiService, JobAnalysisProcessor],
})
export class JobAnalysisModule {}
