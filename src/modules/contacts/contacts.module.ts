import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { JobContact } from 'src/modules/models/job-contact.entity';
import { Job } from 'src/modules/models/job.entity';
import { ContactDiscoveryAiService } from './services/contact-discovery-ai.service';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Job, JobContact]),
    AuthModule,
  ],
  controllers: [ContactsController],
  providers: [ContactsService, ContactDiscoveryAiService],
})
export class ContactsModule {}
