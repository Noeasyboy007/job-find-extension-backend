import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from 'src/modules/auth/auth.module';
import { Resume } from 'src/modules/models/resume.entity';
import { UserApplyProfileModule } from 'src/modules/user-apply-profile/user-apply-profile.module';
import { FormAutofillAiService } from './services/form-autofill-ai.service';
import { FormAutofillController } from './form-autofill.controller';
import { FormAutofillService } from './form-autofill.service';

@Module({
  imports: [SequelizeModule.forFeature([Resume]), AuthModule, UserApplyProfileModule],
  controllers: [FormAutofillController],
  providers: [FormAutofillService, FormAutofillAiService],
})
export class FormAutofillModule {}
