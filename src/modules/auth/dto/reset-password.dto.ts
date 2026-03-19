import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(20, 2000)
  token: string;

  @IsString()
  @Length(6, 255)
  new_password: string;
}

