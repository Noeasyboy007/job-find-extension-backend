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
    RESUME_STATUS,
    type ResumeStatus,
} from 'src/common/constant/resume.constant';

@Table({
    tableName: 'resumes',
    timestamps: true,
    paranoid: true,
    underscored: true,
})
export class Resume extends Model<Resume> {
    @PrimaryKey
    @AutoIncrement
    @Column({ type: DataType.INTEGER })
    declare id: number;

    @ForeignKey(() => User)
    @Column({ field: 'user_id', type: DataType.INTEGER, allowNull: false })
    declare user_id: number;

    @BelongsTo(() => User)
    declare user: User;

    @Column({ field: 'file_name', type: DataType.STRING(255), allowNull: false })
    declare file_name: string;

    @Column({ field: 'file_key', type: DataType.STRING(255), allowNull: false })
    declare file_key: string;

    @Column({ field: 'file_url', type: DataType.TEXT, allowNull: false })
    declare file_url: string;

    @Column({ field: 'file_type', type: DataType.STRING(20), allowNull: false })
    declare file_type: string;

    @Column({ field: 'file_size', type: DataType.INTEGER, allowNull: true })
    declare file_size: number | null;

    // ✅ using constant
    @Default('uploaded')
    @Column({
        type: DataType.ENUM(...RESUME_STATUS),
        allowNull: false,
    })
    declare status: ResumeStatus;

    @Default(false)
    @Column({ field: 'is_active', type: DataType.BOOLEAN, allowNull: false })
    declare is_active: boolean;

    @Column({
        field: 'parsed_data',
        type: DataType.JSONB,
        allowNull: true,
    })
    declare parsed_data: Record<string, any> | null;

    @Column({
        field: 'raw_text',
        type: DataType.TEXT,
        allowNull: true,
    })
    declare raw_text: string | null;

    @Default(1)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare version: number;

    @Column({
        field: 'error_message',
        type: DataType.TEXT,
        allowNull: true,
    })
    declare error_message: string | null;
}