import {
  Column,
  DataType,
  Default,
  Model,
  Table,
  PrimaryKey,
  AutoIncrement,
} from 'sequelize-typescript';

@Table({
  tableName: 'refresh_tokens',
  timestamps: true,
  paranoid: false,
  underscored: true,
})
export class RefreshToken extends Model<RefreshToken> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @Column({ field: 'user_id', type: DataType.INTEGER, allowNull: false })
  declare user_id: number;

  // sha256(refreshToken) - stored as hex.
  @Column({
    field: 'token_hash',
    type: DataType.STRING(64),
    allowNull: false,
    unique: true,
  })
  declare token_hash: string;

  @Default(false)
  @Column({ field: 'is_revoked', type: DataType.BOOLEAN, allowNull: false })
  declare is_revoked: boolean;

  @Column({ field: 'expires_at', type: DataType.DATE, allowNull: false })
  declare expires_at: Date;

  @Column({ field: 'revoked_at', type: DataType.DATE, allowNull: true })
  declare revoked_at: Date | null;
}

