import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { AuthService } from 'src/modules/auth/auth.service';
import { Resume } from 'src/modules/models/resume.entity';
import { UserApplyProfileService } from 'src/modules/user-apply-profile/user-apply-profile.service';
import { MapFormFieldsDto } from './dto/map-form-fields.dto';
import { FormAutofillAiService } from './services/form-autofill-ai.service';

const MAX_VALUE_LEN = 8_000;

export type FormAutofillFillDto = {
  field_key: string;
  value: string;
};

export type FormAutofillMapResponse = {
  fills: FormAutofillFillDto[];
};

@Injectable()
export class FormAutofillService {
  private readonly logger = new Logger(FormAutofillService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectModel(Resume)
    private readonly resumeModel: typeof Resume,
    private readonly applyProfileService: UserApplyProfileService,
    private readonly formAutofillAi: FormAutofillAiService,
  ) {}

  private async requireUserId(authorization?: string): Promise<number> {
    const me = await this.authService.me(authorization);
    return me.id as number;
  }

  async mapFormFields(
    authorization: string | undefined,
    dto: MapFormFieldsDto,
  ): Promise<FormAutofillMapResponse> {
    const userId = await this.requireUserId(authorization);

    if (!dto.fields?.length) {
      throw new BadRequestException('At least one form field is required');
    }

    const resume = await this.resumeModel.findOne({
      where: { user_id: userId, is_active: true },
    });
    if (!resume || resume.status !== 'parsed' || !resume.parsed_data) {
      throw new BadRequestException(
        'An active resume with parsed data is required. Upload a resume and wait for parsing to finish.',
      );
    }

    // Load supplemental apply profile (null is fine — prompt handles missing data gracefully)
    const applyProfile = await this.applyProfileService.getProfile(authorization);

    const allowedKeys = new Set(dto.fields.map((f) => f.field_key));
    const resumeJson = JSON.stringify(resume.parsed_data);
    const profileJson = applyProfile ? JSON.stringify(applyProfile) : null;
    const fieldsJson = JSON.stringify(dto.fields);

    this.logger.log(
      `Form autofill map: userId=${userId} fields=${dto.fields.length} hasProfile=${Boolean(applyProfile)}`,
    );

    const rawFills = await this.formAutofillAi.mapFieldsToResume({
      resumeParsedJson: resumeJson,
      applyProfileJson: profileJson,
      fieldsJson,
    });

    const fills: FormAutofillFillDto[] = [];
    for (const row of rawFills) {
      if (!allowedKeys.has(row.field_key)) continue;
      const v = row.value?.trim() ?? '';
      if (!v) continue;
      fills.push({
        field_key: row.field_key,
        value: v.length > MAX_VALUE_LEN ? v.slice(0, MAX_VALUE_LEN) : v,
      });
    }

    return { fills };
  }
}
