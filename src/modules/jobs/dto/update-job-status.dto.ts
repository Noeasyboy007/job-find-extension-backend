import { IsIn } from 'class-validator';

import { JOB_STATUS, type JobStatus } from 'src/common/constant/job.constant';

export class UpdateJobStatusDto {
  @IsIn(JOB_STATUS as unknown as string[])
  status: JobStatus;
}
