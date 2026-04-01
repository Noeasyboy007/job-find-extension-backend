import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { AuthService } from 'src/modules/auth/auth.service';
import { UserApplyProfile } from 'src/modules/models/user-apply-profile.entity';
import type { UpsertApplyProfileDto } from './dto/upsert-apply-profile.dto';

export type ApplyProfilePublicDto = {
  user_id: number;
  current_company: string | null;
  current_designation: string | null;
  total_experience_months: number | null;
  current_ctc: number | null;
  current_ctc_currency: string;
  expected_ctc_min: number | null;
  expected_ctc_max: number | null;
  expected_ctc_currency: string;
  notice_period_days: number | null;
  notice_period_label: string | null;
  current_city: string | null;
  current_state: string | null;
  current_country: string | null;
  current_pincode: string | null;
  preferred_locations: string[];
  willing_to_relocate: boolean | null;
  work_mode_preference: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  summary_note: string | null;
  updated_at: Date;
};

@Injectable()
export class UserApplyProfileService {
  private readonly logger = new Logger(UserApplyProfileService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectModel(UserApplyProfile)
    private readonly profileModel: typeof UserApplyProfile,
  ) {}

  private async requireUserId(authorization?: string): Promise<number> {
    const me = await this.authService.me(authorization);
    return me.id as number;
  }

  private toDto(row: UserApplyProfile): ApplyProfilePublicDto {
    const p = row.get({ plain: true }) as unknown as Record<string, unknown>;
    return {
      user_id: p.user_id as number,
      current_company: (p.current_company as string | null) ?? null,
      current_designation: (p.current_designation as string | null) ?? null,
      total_experience_months: (p.total_experience_months as number | null) ?? null,
      current_ctc: p.current_ctc != null ? Number(p.current_ctc) : null,
      current_ctc_currency: (p.current_ctc_currency as string) || 'INR',
      expected_ctc_min: p.expected_ctc_min != null ? Number(p.expected_ctc_min) : null,
      expected_ctc_max: p.expected_ctc_max != null ? Number(p.expected_ctc_max) : null,
      expected_ctc_currency: (p.expected_ctc_currency as string) || 'INR',
      notice_period_days: (p.notice_period_days as number | null) ?? null,
      notice_period_label: (p.notice_period_label as string | null) ?? null,
      current_city: (p.current_city as string | null) ?? null,
      current_state: (p.current_state as string | null) ?? null,
      current_country: (p.current_country as string | null) ?? null,
      current_pincode: (p.current_pincode as string | null) ?? null,
      preferred_locations: (p.preferred_locations as string[]) ?? [],
      willing_to_relocate: (p.willing_to_relocate as boolean | null) ?? null,
      work_mode_preference: (p.work_mode_preference as string | null) ?? null,
      linkedin_url: (p.linkedin_url as string | null) ?? null,
      github_url: (p.github_url as string | null) ?? null,
      portfolio_url: (p.portfolio_url as string | null) ?? null,
      summary_note: (p.summary_note as string | null) ?? null,
      updated_at: p.updatedAt as Date,
    };
  }

  async getProfile(authorization: string | undefined): Promise<ApplyProfilePublicDto | null> {
    const userId = await this.requireUserId(authorization);
    const row = await this.profileModel.findOne({ where: { user_id: userId } });
    return row ? this.toDto(row) : null;
  }

  async upsertProfile(
    authorization: string | undefined,
    dto: UpsertApplyProfileDto,
  ): Promise<ApplyProfilePublicDto> {
    const userId = await this.requireUserId(authorization);

    const existing = await this.profileModel.findOne({ where: { user_id: userId } });
    if (existing) {
      await existing.update({
        current_company: dto.current_company ?? existing.current_company,
        current_designation: dto.current_designation ?? existing.current_designation,
        total_experience_months: dto.total_experience_months ?? existing.total_experience_months,
        current_ctc: dto.current_ctc ?? existing.current_ctc,
        current_ctc_currency: dto.current_ctc_currency ?? existing.current_ctc_currency,
        expected_ctc_min: dto.expected_ctc_min ?? existing.expected_ctc_min,
        expected_ctc_max: dto.expected_ctc_max ?? existing.expected_ctc_max,
        expected_ctc_currency: dto.expected_ctc_currency ?? existing.expected_ctc_currency,
        notice_period_days: dto.notice_period_days ?? existing.notice_period_days,
        notice_period_label: dto.notice_period_label ?? existing.notice_period_label,
        current_city: dto.current_city ?? existing.current_city,
        current_state: dto.current_state ?? existing.current_state,
        current_country: dto.current_country ?? existing.current_country,
        current_pincode: dto.current_pincode ?? existing.current_pincode,
        preferred_locations: dto.preferred_locations ?? existing.preferred_locations,
        willing_to_relocate: dto.willing_to_relocate ?? existing.willing_to_relocate,
        work_mode_preference: dto.work_mode_preference ?? existing.work_mode_preference,
        linkedin_url: dto.linkedin_url ?? existing.linkedin_url,
        github_url: dto.github_url ?? existing.github_url,
        portfolio_url: dto.portfolio_url ?? existing.portfolio_url,
        summary_note: dto.summary_note ?? existing.summary_note,
      } as never);
      this.logger.log(`Apply profile updated for userId=${userId}`);
      return this.toDto(await existing.reload());
    }

    const created = await this.profileModel.create({
      user_id: userId,
      current_company: dto.current_company ?? null,
      current_designation: dto.current_designation ?? null,
      total_experience_months: dto.total_experience_months ?? null,
      current_ctc: dto.current_ctc ?? null,
      current_ctc_currency: dto.current_ctc_currency ?? 'INR',
      expected_ctc_min: dto.expected_ctc_min ?? null,
      expected_ctc_max: dto.expected_ctc_max ?? null,
      expected_ctc_currency: dto.expected_ctc_currency ?? 'INR',
      notice_period_days: dto.notice_period_days ?? null,
      notice_period_label: dto.notice_period_label ?? null,
      current_city: dto.current_city ?? null,
      current_state: dto.current_state ?? null,
      current_country: dto.current_country ?? null,
      current_pincode: dto.current_pincode ?? null,
      preferred_locations: dto.preferred_locations ?? [],
      willing_to_relocate: dto.willing_to_relocate ?? null,
      work_mode_preference: dto.work_mode_preference ?? null,
      linkedin_url: dto.linkedin_url ?? null,
      github_url: dto.github_url ?? null,
      portfolio_url: dto.portfolio_url ?? null,
      summary_note: dto.summary_note ?? null,
    } as never);
    this.logger.log(`Apply profile created for userId=${userId}`);
    return this.toDto(created);
  }
}
