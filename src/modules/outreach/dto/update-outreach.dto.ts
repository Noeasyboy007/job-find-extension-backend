import { IsIn, IsOptional, IsString } from 'class-validator';
import { OUTREACH_MESSAGE_STATUS } from 'src/common/constant/outreach.constant';

export class UpdateOutreachDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(OUTREACH_MESSAGE_STATUS as unknown as string[])
  status?: string;
}
