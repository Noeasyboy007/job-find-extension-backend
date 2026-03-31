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
import { Job } from './job.entity';
import {
  JOB_ANALYSIS_STATUS,
  type JobAnalysisStatus,
} from 'src/common/constant/job-analysis.constant';

@Table({
  tableName: 'job_analyses',
  timestamps: true,
  underscored: true,
})
export class JobAnalysis extends Model<JobAnalysis> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.INTEGER, allowNull: false })
  declare user_id: number;

  @BelongsTo(() => User)
  declare user: User;

  @ForeignKey(() => Job)
  @Column({ field: 'job_id', type: DataType.INTEGER, allowNull: false, unique: true })
  declare job_id: number;

  @BelongsTo(() => Job)
  declare job: Job;

  @Default('queued')
  @Column({
    type: DataType.ENUM(...JOB_ANALYSIS_STATUS),
    allowNull: false,
  })
  declare status: JobAnalysisStatus;

  @Column({ field: 'fit_score', type: DataType.SMALLINT, allowNull: true })
  declare fit_score: number | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare result: Record<string, unknown> | null;

  @Column({ field: 'error_message', type: DataType.TEXT, allowNull: true })
  declare error_message: string | null;
}
