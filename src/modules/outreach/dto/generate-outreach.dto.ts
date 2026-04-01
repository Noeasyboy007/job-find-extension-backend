import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OUTREACH_MESSAGE_TYPE } from 'src/common/constant/outreach.constant';

export class GenerateOutreachDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId: number;

  @IsIn(OUTREACH_MESSAGE_TYPE as unknown as string[])
  type: string;

  /** Optional — link the draft to a discovered contact for personalised addressing. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contactId?: number;
}
