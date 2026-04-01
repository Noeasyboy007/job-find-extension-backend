import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListOutreachQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  job_id?: number;
}
