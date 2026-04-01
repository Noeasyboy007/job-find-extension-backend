import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import appConfig from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { QueuesModule } from './modules/queues/queues.module';
import { UserModule } from './modules/users/user.module';
import { ResumesModule } from './modules/resumes/resumes.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { JobAnalysisModule } from './modules/job-analysis/job-analysis.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { FormAutofillModule } from './modules/form-autofill/form-autofill.module';
import { UserApplyProfileModule } from './modules/user-apply-profile/user-apply-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig],
    }),
    DatabaseModule,
    QueuesModule,
    AuthModule,
    UserModule,
    ResumesModule,
    JobsModule,
    JobAnalysisModule,
    OutreachModule,
    ContactsModule,
    FormAutofillModule,
    UserApplyProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }