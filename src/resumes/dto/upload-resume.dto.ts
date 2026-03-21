import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;
}
