import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default,
  Unique,
} from 'sequelize-typescript';

import { User } from './user.entity';

@Table({
  tableName: 'user_apply_profiles',
  timestamps: true,
  underscored: true,
})
export class UserApplyProfile extends Model<UserApplyProfile> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @Unique
  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.INTEGER, allowNull: false })
  declare user_id: number;

  @BelongsTo(() => User)
  declare user: User;

  /* ── Current role ─────────────────────────────────────── */
  @Column({ field: 'current_company', type: DataType.STRING(255), allowNull: true })
  declare current_company: string | null;

  @Column({ field: 'current_designation', type: DataType.STRING(255), allowNull: true })
  declare current_designation: string | null;

  /** Total experience in months (easier to compute, display as "X years Y months"). */
  @Column({ field: 'total_experience_months', type: DataType.SMALLINT, allowNull: true })
  declare total_experience_months: number | null;

  /* ── Compensation ──────────────────────────────────────── */
  @Column({ field: 'current_ctc', type: DataType.DECIMAL(14, 2), allowNull: true })
  declare current_ctc: number | null;

  @Default('INR')
  @Column({ field: 'current_ctc_currency', type: DataType.STRING(10), allowNull: false })
  declare current_ctc_currency: string;

  @Column({ field: 'expected_ctc_min', type: DataType.DECIMAL(14, 2), allowNull: true })
  declare expected_ctc_min: number | null;

  @Column({ field: 'expected_ctc_max', type: DataType.DECIMAL(14, 2), allowNull: true })
  declare expected_ctc_max: number | null;

  @Default('INR')
  @Column({ field: 'expected_ctc_currency', type: DataType.STRING(10), allowNull: false })
  declare expected_ctc_currency: string;

  /* ── Availability ──────────────────────────────────────── */
  /** Notice period in days (0 = immediate). */
  @Column({ field: 'notice_period_days', type: DataType.SMALLINT, allowNull: true })
  declare notice_period_days: number | null;

  /** Free-text label the user prefers to show (e.g. "Immediate", "30 Days", "Negotiable"). */
  @Column({ field: 'notice_period_label', type: DataType.STRING(100), allowNull: true })
  declare notice_period_label: string | null;

  /* ── Location ──────────────────────────────────────────── */
  @Column({ field: 'current_city', type: DataType.STRING(150), allowNull: true })
  declare current_city: string | null;

  @Column({ field: 'current_state', type: DataType.STRING(150), allowNull: true })
  declare current_state: string | null;

  @Column({ field: 'current_country', type: DataType.STRING(150), allowNull: true })
  declare current_country: string | null;

  @Column({ field: 'current_pincode', type: DataType.STRING(20), allowNull: true })
  declare current_pincode: string | null;

  /** Array of preferred location strings stored as JSONB. */
  @Default([])
  @Column({ field: 'preferred_locations', type: DataType.JSONB, allowNull: false })
  declare preferred_locations: string[];

  /* ── Work preference ───────────────────────────────────── */
  @Column({ field: 'willing_to_relocate', type: DataType.BOOLEAN, allowNull: true })
  declare willing_to_relocate: boolean | null;

  /** "remote" | "hybrid" | "onsite" | "any" */
  @Column({ field: 'work_mode_preference', type: DataType.STRING(20), allowNull: true })
  declare work_mode_preference: string | null;

  /* ── Online profiles ───────────────────────────────────── */
  @Column({ field: 'linkedin_url', type: DataType.STRING(512), allowNull: true })
  declare linkedin_url: string | null;

  @Column({ field: 'github_url', type: DataType.STRING(512), allowNull: true })
  declare github_url: string | null;

  @Column({ field: 'portfolio_url', type: DataType.STRING(512), allowNull: true })
  declare portfolio_url: string | null;

  /* ── Extra ─────────────────────────────────────────────── */
  /** Any additional notes / "about me" the user wants to include in autofill. */
  @Column({ field: 'summary_note', type: DataType.TEXT, allowNull: true })
  declare summary_note: string | null;
}
