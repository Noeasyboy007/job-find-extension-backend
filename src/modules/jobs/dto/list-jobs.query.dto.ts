import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { JOB_SOURCE_PLATFORM } from 'src/common/constant/job.constant';

function optionalInt(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export class ListJobsQueryDto {
  @IsOptional()
  @Transform(({ value }) => optionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => optionalInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Free-text search across title + company_name. */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsIn(JOB_SOURCE_PLATFORM as unknown as string[])
  source_platform?: string;
}

