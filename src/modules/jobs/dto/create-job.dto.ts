import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  JOB_SOURCE_PLATFORM,
  type JobSourcePlatform,
} from 'src/common/constant/job.constant';

export class CreateJobDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  company_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  work_mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  work_time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  salary?: string;

  @IsIn(JOB_SOURCE_PLATFORM as unknown as string[])
  source_platform: JobSourcePlatform;

  @IsOptional()
  @IsString()
  source_url?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  employment_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  experience_level?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  skills?: string[];

  @IsOptional()
  @IsObject()
  raw_payload?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  extracted_metadata?: Record<string, unknown>;
}
