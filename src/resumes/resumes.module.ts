import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { Resume } from 'src/modules/models/resume.entity';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [SequelizeModule.forFeature([Resume]), AuthModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
