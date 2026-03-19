import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(6, 255)
  old_password: string;

  @IsString()
  @Length(6, 255)
  new_password: string;

  @IsString()
  @Length(6, 255)
  confirm_password: string;
}

