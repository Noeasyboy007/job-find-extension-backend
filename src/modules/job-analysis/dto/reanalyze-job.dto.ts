import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReanalyzeJobDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId: number;
}
