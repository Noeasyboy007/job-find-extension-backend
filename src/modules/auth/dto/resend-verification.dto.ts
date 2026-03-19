import { IsEmail, IsString, Length } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}

