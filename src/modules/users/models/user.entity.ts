import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
} from 'sequelize-typescript';
import { USER_ROLES } from 'src/common/constant/user.constant';
import type { UserRole } from 'src/common/constant/user.constant';

@Table({ tableName: 'users', timestamps: true, paranoid: true, underscored: true })
export class User extends Model<User> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @Column({ field: 'first_name', type: DataType.STRING(100), allowNull: false })
  declare first_name: string;

  @Column({ field: 'last_name', type: DataType.STRING(100), allowNull: true })
  declare last_name: string | null;

  @Column({ type: DataType.STRING(150), allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare phone_number: string | null;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare password_hash: string;

  @Default(true)
  @Column({ field: 'is_active', type: DataType.BOOLEAN, allowNull: false })
  declare is_active: boolean;

  @Default('user')
  @Column({ type: DataType.ENUM(...USER_ROLES), allowNull: false })
  declare user_role: UserRole;
}