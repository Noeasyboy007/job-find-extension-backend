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
  OUTREACH_MESSAGE_TYPE,
  OUTREACH_GENERATION_STATUS,
  OUTREACH_MESSAGE_STATUS,
  type OutreachMessageType,
  type OutreachGenerationStatus,
  type OutreachMessageStatus,
} from 'src/common/constant/outreach.constant';

@Table({
  tableName: 'outreach_messages',
  timestamps: true,
  underscored: true,
})
export class OutreachMessage extends Model<OutreachMessage> {
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

  @Column({
    type: DataType.ENUM(...OUTREACH_MESSAGE_TYPE),
    allowNull: false,
  })
  declare type: OutreachMessageType;

  @Default('queued')
  @Column({
    field: 'generation_status',
    type: DataType.ENUM(...OUTREACH_GENERATION_STATUS),
    allowNull: false,
  })
  declare generation_status: OutreachGenerationStatus;

  @Default('draft')
  @Column({
    type: DataType.ENUM(...OUTREACH_MESSAGE_STATUS),
    allowNull: false,
  })
  declare status: OutreachMessageStatus;

  /** The AI-generated (and user-editable) message text. */
  @Column({ type: DataType.TEXT, allowNull: true })
  declare content: string | null;

  /** Linked contact id (nullable — no hard FK so deleting a contact keeps the draft). */
  @Column({ field: 'contact_id', type: DataType.INTEGER, allowNull: true })
  declare contact_id: number | null;

  @Column({ field: 'contact_name', type: DataType.STRING(255), allowNull: true })
  declare contact_name: string | null;

  @Column({ field: 'contact_role', type: DataType.STRING(255), allowNull: true })
  declare contact_role: string | null;

  @Column({ field: 'contact_email', type: DataType.STRING(255), allowNull: true })
  declare contact_email: string | null;

  @Column({ field: 'error_message', type: DataType.TEXT, allowNull: true })
  declare error_message: string | null;
}
