import {
    IsBoolean,
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    Length,
} from 'class-validator';
import { USER_ROLES } from 'src/common/constant/user.constant';
import type { UserRole } from 'src/common/constant/user.constant';

export class CreateUserDto {
    @IsString()
    @Length(1, 100)
    first_name: string;


    @IsOptional()
    @IsString()
    @Length(1, 100)
    last_name?: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    @Length(7, 20)
    phone_number?: string;

    @IsString()
    @Length(6, 255)
    password: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsIn(USER_ROLES)
    user_role?: UserRole;
}