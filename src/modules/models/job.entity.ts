import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import { User } from './user.entity';
import {
  JOB_SOURCE_PLATFORM,
  JOB_STATUS,
  type JobSourcePlatform,
  type JobStatus,
} from 'src/common/constant/job.constant';

@Table({
  tableName: 'jobs',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Job extends Model<Job> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.INTEGER, allowNull: false })
  declare user_id: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column({ type: DataType.STRING(500), allowNull: false })
  declare title: string;

  @Column({ field: 'company_name', type: DataType.STRING(500), allowNull: false })
  declare company_name: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  declare location: string | null;

  @Column({ field: 'work_mode', type: DataType.STRING(100), allowNull: true })
  declare work_mode: string | null;

  @Column({ field: 'work_time', type: DataType.STRING(100), allowNull: true })
  declare work_time: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare salary: string | null;

  @Column({
    field: 'source_platform',
    type: DataType.ENUM(...JOB_SOURCE_PLATFORM),
    allowNull: false,
  })
  declare source_platform: JobSourcePlatform;

  @Column({ field: 'source_url', type: DataType.TEXT, allowNull: true })
  declare source_url: string | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare description: string;

  @Column({ field: 'employment_type', type: DataType.STRING(100), allowNull: true })
  declare employment_type: string | null;

  @Column({ field: 'experience_level', type: DataType.STRING(100), allowNull: true })
  declare experience_level: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare skills: string[] | null;

  @Column({ field: 'raw_payload', type: DataType.JSONB, allowNull: true })
  declare raw_payload: Record<string, unknown> | null;

  @Column({ field: 'extracted_metadata', type: DataType.JSONB, allowNull: true })
  declare extracted_metadata: Record<string, unknown> | null;

  @Default('captured')
  @Column({
    type: DataType.ENUM(...JOB_STATUS),
    allowNull: false,
  })
  declare status: JobStatus;
}
