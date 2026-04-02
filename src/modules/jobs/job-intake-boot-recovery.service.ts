import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JobsService } from './jobs.service';

@Injectable()
export class JobIntakeBootRecovery implements OnModuleInit {
  private readonly logger = new Logger(JobIntakeBootRecovery.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jobsService: JobsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.config.get<boolean>('app.jobIntake.requeueFailedOnBoot');
    if (!enabled) {
      return;
    }
    const n = await this.jobsService.requeueFailedStructureJobsOnBoot();
    if (n > 0) {
      this.logger.log(
        `JOB_INTAKE_REQUEUE_FAILED_ON_BOOT: re-enqueued structuring for ${n} job(s)`,
      );
    }
  }
}
