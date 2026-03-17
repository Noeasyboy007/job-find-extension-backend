import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from 'src/common/helpers/password.utils';
import { USER_ROLES } from 'src/common/constant/user.constant';
import type { UserRole } from 'src/common/constant/user.constant';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User)
        private readonly userModel: typeof User,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        // Validate email uniqueness
        const existingUser = await this.userModel.findOne({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Hash password
        const password_hash = await hashPassword(createUserDto.password);

        // Create user
        const user = await this.userModel.create({
            first_name: createUserDto.first_name,
            last_name: createUserDto.last_name || null,
            email: createUserDto.email,
            phone_number: createUserDto.phone_number || null,
            password_hash: password_hash,
            is_active: createUserDto.is_active ?? true,
            user_role: (createUserDto.user_role || USER_ROLES[1]) as UserRole, // Default to 'user'
        } as any);

        return user;
    }

    async findAll(): Promise<User[]> {
        return this.userModel.findAll();
    }
}
