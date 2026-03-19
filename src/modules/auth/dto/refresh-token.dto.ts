import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Length(20, 2000)
  refresh_token: string;
}

