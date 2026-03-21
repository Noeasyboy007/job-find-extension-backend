import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from '../models/refresh-token.entity';
import { User } from '../models/user.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([RefreshToken, User]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule { }
