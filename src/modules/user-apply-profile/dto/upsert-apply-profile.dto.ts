import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const WORK_MODES = ['remote', 'hybrid', 'onsite', 'any'] as const;

export class UpsertApplyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  current_company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  current_designation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(600)
  @Type(() => Number)
  total_experience_months?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  current_ctc?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  current_ctc_currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  expected_ctc_min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  expected_ctc_max?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  expected_ctc_currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  @Type(() => Number)
  notice_period_days?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  notice_period_label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  current_city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  current_state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  current_country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  current_pincode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferred_locations?: string[];

  @IsOptional()
  @IsBoolean()
  willing_to_relocate?: boolean;

  @IsOptional()
  @IsIn(WORK_MODES)
  work_mode_preference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  linkedin_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  github_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  portfolio_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  summary_note?: string;
}
