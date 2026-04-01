import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import { User } from './user.entity';
import { Job } from './job.entity';

@Table({
  tableName: 'job_contacts',
  timestamps: true,
  underscored: true,
})
export class JobContact extends Model<JobContact> {
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
  @Column({ field: 'job_id', type: DataType.INTEGER, allowNull: false })
  declare job_id: number;

  @BelongsTo(() => Job)
  declare job: Job;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare name: string | null;

  /** Inferred role label (e.g. "HR Manager", "Founder"). */
  @Column({ type: DataType.STRING(100), allowNull: true })
  declare role: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare email: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  declare phone: string | null;

  @Column({ field: 'linkedin_url', type: DataType.TEXT, allowNull: true })
  declare linkedin_url: string | null;

  /** 0–100 based on how explicitly the contact was mentioned. */
  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare confidence: number;

  /** Short phrase describing where in the job text this was found. */
  @Column({ field: 'source_hint', type: DataType.STRING(255), allowNull: true })
  declare source_hint: string | null;
}
