import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateResumeDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;
}
