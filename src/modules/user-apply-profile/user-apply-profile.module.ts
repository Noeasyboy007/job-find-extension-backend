import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { UserApplyProfile } from 'src/modules/models/user-apply-profile.entity';
import { UserApplyProfileController } from './user-apply-profile.controller';
import { UserApplyProfileService } from './user-apply-profile.service';

@Module({
  imports: [SequelizeModule.forFeature([UserApplyProfile]), AuthModule],
  controllers: [UserApplyProfileController],
  providers: [UserApplyProfileService],
  exports: [UserApplyProfileService],
})
export class UserApplyProfileModule {}
