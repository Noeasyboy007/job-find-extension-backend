import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { Resume } from 'src/modules/models/resume.entity';
import { QueuesModule } from 'src/modules/queues/queues.module';
import { ResumeParsningProcessor } from './processors/resume-parsing.processor';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { ResumeParseAiService } from './services/resume-parse-ai.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Resume]),
    AuthModule,
    QueuesModule,
  ],
  controllers: [ResumesController],
  providers: [ResumesService, ResumeParseAiService, ResumeParsningProcessor],
})
export class ResumesModule {}
