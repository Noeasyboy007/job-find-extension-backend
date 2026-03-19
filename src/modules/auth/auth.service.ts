import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { InjectModel } from '@nestjs/sequelize';
import { RefreshToken } from '../models/refresh-token.entity';
import { User } from '../models/user.entity';
import type { SignUpDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { LogoutDto } from './dto/logout.dto';
import { signJwt, verifyJwt } from 'src/common/helpers/jwt.util';
import { comparePassword, hashPassword } from 'src/common/helpers/password.utils';
import { HttpException } from '@nestjs/common';
import {
    sendMail,
    renderForgotPasswordEmailHtml,
    renderPasswordChangedEmailHtml,
    renderPasswordResetSuccessEmailHtml,
    renderWelcomeEmailHtml,
    renderVerifyUserEmailHtml,
} from 'src/common/helpers/nodemailer.helper';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { ResendVerificationDto } from './dto/resend-verification.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { USER_ROLES } from 'src/common/constant/user.constant';
import type { UserRole } from 'src/common/constant/user.constant';

type JwtAccessPayload = {
    sub: number;
    email: string;
    role: string;
};

type JwtRefreshPayload = {
    sub: number;
};

function publicUser(user: any) {
    const plain = user?.get?.({ plain: true }) ?? user;
    // Ensure we never expose password_hash.
    const { password_hash, ...rest } = plain;
    return rest;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly forgotPasswordRate = new Map<string, number[]>();
    private readonly resetPasswordRate = new Map<string, number[]>();
    private readonly rateLimitMinGapMs = 3 * 60 * 1000; // 3 minutes
    private readonly rateLimitDailyWindowMs = 24 * 60 * 60 * 1000; // 24 hours
    private readonly rateLimitDailyMax = 5;

    constructor(
        private readonly configService: ConfigService,
        @InjectModel(User)
        private readonly userModel: typeof User,
        @InjectModel(RefreshToken)
        private readonly refreshTokenModel: typeof RefreshToken,
    ) { }

    private get jwtConfig() {
        const accessSecret = this.configService.get<string>('app.jwt.accessSecret');
        const refreshSecret = this.configService.get<string>('app.jwt.refreshSecret');
        const accessExpiresInSeconds = this.configService.get<number>(
            'app.jwt.accessExpiresInSeconds',
        );
        const refreshExpiresInSeconds = this.configService.get<number>(
            'app.jwt.refreshExpiresInSeconds',
        );

        if (!accessSecret || !refreshSecret) {
            throw new HttpException(
                'JWT secrets are not configured',
                500,
            );
        }

        return {
            accessSecret,
            refreshSecret,
            accessExpiresInSeconds: Number(accessExpiresInSeconds) || 900,
            refreshExpiresInSeconds: Number(refreshExpiresInSeconds) || 604800,
        };
    }

    private extractBearerToken(authHeader?: string): string {
        if (!authHeader) throw new UnauthorizedException('Authorization header missing');
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
            throw new UnauthorizedException('Invalid authorization header');
        }

        return parts[1];
    }

    private get emailVerificationConfig() {
        const secret = this.configService.get<string>(
            'app.jwt.emailVerificationSecret',
        );
        const expiresInSeconds = this.configService.get<number>(
            'app.jwt.emailVerificationExpiresInSeconds',
        );

        if (!secret) {
            throw new HttpException(
                'Email verification secret is not configured',
                500,
            );
        }

        return {
            secret,
            expiresInSeconds: Number(expiresInSeconds) || 86400,
        };
    }

    private get passwordResetConfig() {
        const secret = this.configService.get<string>('app.jwt.passwordResetSecret');
        const expiresInSeconds = this.configService.get<number>(
            'app.jwt.passwordResetExpiresInSeconds',
        );

        if (!secret) {
            throw new HttpException(
                'Password reset secret is not configured',
                500,
            );
        }

        return {
            secret,
            expiresInSeconds: Number(expiresInSeconds) || 3600,
        };
    }

    private get passwordResetUrlBase() {
        return this.configService.get<string>('app.passwordReset.urlBase')
            || 'http://localhost:5050/api/v1/auth/reset-password';
    }

    private get mailConfig() {
        const host = this.configService.get<string>('app.mail.host');
        const port = this.configService.get<number>('app.mail.port');
        const secure = this.configService.get<boolean>('app.mail.secure');
        const user = this.configService.get<string>('app.mail.user') || '';
        const pass = this.configService.get<string>('app.mail.pass') || '';
        const from = this.configService.get<string>('app.mail.from');

        if (!host || !port || !from) {
            throw new HttpException('Mail config is not configured', 500);
        }

        return { host, port, secure: Boolean(secure), user, pass, from };
    }

    private enforceRateLimit(
        bucket: Map<string, number[]>,
        key: string,
        actionName: string,
    ) {
        const isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
        if (!isProduction) return;

        const now = Date.now();
        const windowStart = now - this.rateLimitDailyWindowMs;
        const attempts = (bucket.get(key) || []).filter((ts) => ts >= windowStart);

        const lastAttempt = attempts.length ? attempts[attempts.length - 1] : undefined;
        if (lastAttempt && now - lastAttempt < this.rateLimitMinGapMs) {
            const secondsLeft = Math.ceil((this.rateLimitMinGapMs - (now - lastAttempt)) / 1000);
            throw new HttpException(
                `${actionName} rate limited. Please wait ${secondsLeft}s before trying again.`,
                429,
            );
        }

        if (attempts.length >= this.rateLimitDailyMax) {
            throw new HttpException(
                `${actionName} daily limit exceeded. Maximum ${this.rateLimitDailyMax} requests per 24 hours.`,
                429,
            );
        }

        attempts.push(now);
        bucket.set(key, attempts);
    }

    private hashRefreshToken(refreshToken: string): string {
        // Store only a hash of refresh tokens.
        return createHash('sha256').update(refreshToken).digest('hex');
    }

    private signAccessToken(user: any): string {
        const { accessSecret, accessExpiresInSeconds } = this.jwtConfig;

        const payload: JwtAccessPayload = {
            sub: user.id,
            email: user.email,
            role: user.user_role,
        };

        return signJwt(payload, accessSecret, accessExpiresInSeconds);
    }

    private signRefreshToken(user: any): string {
        const { refreshSecret, refreshExpiresInSeconds } = this.jwtConfig;

        const payload: JwtRefreshPayload = { sub: user.id };
        return signJwt(payload, refreshSecret, refreshExpiresInSeconds);
    }

    private async rotateRefreshTokensForUser(userId: number) {
        // Keep the system simpler: only one active refresh token per user.
        await this.refreshTokenModel.update(
            { is_revoked: true, revoked_at: new Date() },
            { where: { user_id: userId, is_revoked: false } },
        );
    }

    private async createRefreshTokenRecord(user: any): Promise<string> {
        const { refreshExpiresInSeconds } = this.jwtConfig;
        const refreshToken = this.signRefreshToken(user);
        const token_hash = this.hashRefreshToken(refreshToken);
        const expires_at = new Date(Date.now() + refreshExpiresInSeconds * 1000);

        await this.refreshTokenModel.create({
            user_id: user.id,
            token_hash,
            expires_at,
            is_revoked: false,
            revoked_at: null,
        } as any);

        return refreshToken;
    }

    async signup(dto: SignUpDto) {
        const existingUser = await this.userModel.findOne({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const password_hash = await hashPassword(dto.password);
        const user = await this.userModel.create({
            first_name: dto.first_name,
            last_name: dto.last_name || null,
            email: dto.email,
            country_code: dto.country_code || null,
            phone_number: dto.phone_number || null,
            password_hash,
            is_active: dto.is_active ?? true,
            is_verified: false,
            user_role: (dto.user_role || USER_ROLES[1]) as UserRole,
        } as any);

        const { secret, expiresInSeconds } = this.emailVerificationConfig;
        const verificationToken = signJwt(
            { type: 'email_verification', sub: user.id, email: user.email },
            secret,
            expiresInSeconds,
        );

        const verificationLink = `${this.configService.get<string>('app.emailVerification.urlBase')}`
            + `?token=${encodeURIComponent(verificationToken)}`;

        const html = await renderVerifyUserEmailHtml({
            firstName: user.first_name,
            verificationLink,
        });
        const isDevelopment = this.configService.get<string>('app.nodeEnv') === 'development';

        try {
            await sendMail({
                config: this.mailConfig,
                to: user.email,
                subject: 'Verify your email address',
                html,
            });

            return {
                user: publicUser(user),
                message: 'Verification email sent. Please verify to activate your account.',
                ...(isDevelopment
                    ? {
                        verificationToken,
                        verificationLink,
                    }
                    : {}),
            };
        } catch (error: any) {
            const mailErrorMessage = error?.message || 'Unknown mail error';
            this.logger.error(
                `Signup email send failed for ${user.email}: ${mailErrorMessage}`,
            );

            // User is already created; avoid returning a signup failure due to SMTP issues.
            return {
                user: publicUser(user),
                message:
                    'Signup completed, but verification email could not be sent right now. Please try resend verification.',
                ...(isDevelopment
                    ? {
                        verificationToken,
                        verificationLink,
                    }
                    : {}),
            };
        }
    }

    async login(dto: LoginDto) {
        const user = await this.userModel.findOne({
            where: { email: dto.email },
        });
        if (!user || !user.password_hash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.is_verified) {
            throw new UnauthorizedException('Please verify your email address before logging in');
        }

        const passwordOk = await comparePassword(dto.password, user.password_hash);
        if (!passwordOk) {
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.rotateRefreshTokensForUser(user.id);
        const accessToken = this.signAccessToken(user);
        const refreshToken = await this.createRefreshTokenRecord(user);

        return {
            user: publicUser(user),
            accessToken,
            refreshToken,
        };
    }

    async refresh(dto: RefreshTokenDto) {
        const token = dto.refresh_token;
        if (!token) throw new UnauthorizedException('Refresh token missing');

        let payload: JwtRefreshPayload;
        try {
            payload = verifyJwt<JwtRefreshPayload>(token, this.jwtConfig.refreshSecret);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const userId = payload.sub;
        const token_hash = this.hashRefreshToken(token);

        const record = await this.refreshTokenModel.findOne({
            where: { user_id: userId, token_hash },
        });

        if (!record || record.is_revoked) {
            throw new UnauthorizedException('Refresh token revoked');
        }

        if (record.expires_at && record.expires_at.getTime() <= Date.now()) {
            throw new UnauthorizedException('Refresh token expired');
        }

        // Revoke the used refresh token (rotation).
        record.is_revoked = true;
        record.revoked_at = new Date();
        await record.save();

        const user = await this.userModel.findByPk(userId);
        if (!user) throw new UnauthorizedException('User not found');
        if (!user.is_verified) {
            throw new UnauthorizedException('Please verify your email address before continuing');
        }

        // Keep single-active refresh tokens.
        await this.rotateRefreshTokensForUser(userId);

        const accessToken = this.signAccessToken(user);
        const refreshToken = await this.createRefreshTokenRecord(user);

        return {
            user: publicUser(user),
            accessToken,
            refreshToken,
        };
    }

    async logout(dto: LogoutDto) {
        const token = dto.refresh_token;
        if (!token) throw new UnauthorizedException('Refresh token missing');

        const token_hash = this.hashRefreshToken(token);
        await this.refreshTokenModel.update(
            { is_revoked: true, revoked_at: new Date() },
            { where: { token_hash, is_revoked: false } },
        );

        return { message: 'Logged out successfully' };
    }

    async me(authHeader?: string) {
        const accessToken = this.extractBearerToken(authHeader);

        let payload: JwtAccessPayload;
        try {
            payload = verifyJwt<JwtAccessPayload>(
                accessToken,
                this.jwtConfig.accessSecret,
            );
        } catch {
            throw new UnauthorizedException('Invalid access token');
        }

        const userId = payload.sub;
        const user = await this.userModel.findByPk(userId);
        if (!user) throw new UnauthorizedException('User not found');
        if (!user.is_verified) {
            throw new UnauthorizedException('Please verify your email address before using this');
        }

        return publicUser(user);
    }

    async verifyEmail(token: string) {
        if (!token) throw new UnauthorizedException('Verification token missing');

        let payload: any;
        const { secret } = this.emailVerificationConfig;
        try {
            payload = verifyJwt<any>(token, secret);
        } catch {
            throw new UnauthorizedException('Invalid or expired verification token');
        }

        if (payload?.type !== 'email_verification' || typeof payload?.sub !== 'number') {
            throw new UnauthorizedException('Invalid verification token payload');
        }

        const user = await this.userModel.findByPk(payload.sub);
        if (!user) throw new UnauthorizedException('User not found');

        if (user.is_verified) {
            return {
                user: publicUser(user),
                message: 'Email already verified',
            };
        }

        user.is_verified = true;
        await user.save();

        // Send a welcome email; do not block verification if the email fails.
        try {
            const welcomeHtml = await renderWelcomeEmailHtml({
                firstName: user.first_name,
            });

            await sendMail({
                config: this.mailConfig,
                to: user.email,
                subject: 'Welcome to HireReach',
                html: welcomeHtml,
            });
        } catch {
            // Intentionally ignore welcome email failures.
        }

        return {
            user: publicUser(user),
            message: 'Email verified successfully',
        };
    }

    async resendVerification(dto: ResendVerificationDto) {
        const email = dto.email;
        const user = await this.userModel.findOne({ where: { email } });
        const isDevelopment = this.configService.get<string>('app.nodeEnv') === 'development';

        if (!user) {
            return {
                message: 'If your account exists, we sent a verification email.',
            };
        }

        if (user.is_verified) {
            throw new BadRequestException('Account is already verified');
        }

        const { secret, expiresInSeconds } = this.emailVerificationConfig;
        const verificationToken = signJwt(
            { type: 'email_verification', sub: user.id, email: user.email },
            secret,
            expiresInSeconds,
        );

        const verificationLink = `${this.configService.get<string>('app.emailVerification.urlBase')}`
            + `?token=${encodeURIComponent(verificationToken)}`;

        const html = await renderVerifyUserEmailHtml({
            firstName: user.first_name,
            verificationLink,
        });

        await sendMail({
            config: this.mailConfig,
            to: user.email,
            subject: 'Verify your email address',
            html,
        });

        return {
            message: 'If your account exists, we sent a verification email.',
            ...(isDevelopment
                ? {
                    verificationToken,
                    verificationLink,
                }
                : {}),
        };
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const email = dto.email;
        const emailKey = email.trim().toLowerCase();
        this.enforceRateLimit(this.forgotPasswordRate, emailKey, 'Forgot password');
        const user = await this.userModel.findOne({ where: { email } });
        const isDevelopment = this.configService.get<string>('app.nodeEnv') === 'development';

        if (!user) {
            return {
                message: 'If your account exists, we sent a password reset email.',
            };
        }

        const { secret, expiresInSeconds } = this.passwordResetConfig;
        const nextPasswordResetVersion = (user.password_reset_version || 0) + 1;
        user.password_reset_version = nextPasswordResetVersion;
        await user.save();

        // Bind token to current password-hash version so the token becomes unusable
        // immediately after a successful password reset.
        const passwordVersionHash = createHash('sha256')
            .update(user.password_hash)
            .digest('hex');
        const token = signJwt(
            {
                type: 'password_reset',
                sub: user.id,
                email: user.email,
                pvh: passwordVersionHash,
                prv: nextPasswordResetVersion,
            },
            secret,
            expiresInSeconds,
        );

        const resetLink = `${this.passwordResetUrlBase}?token=${encodeURIComponent(token)}`;

        const html = await renderForgotPasswordEmailHtml({
            firstName: user.first_name,
            resetLink,
        });

        await sendMail({
            config: this.mailConfig,
            to: user.email,
            subject: 'Reset your password',
            html,
        });

        return {
            message: 'If your account exists, we sent a password reset email.',
            ...(isDevelopment
                ? {
                    resetToken: token,
                    resetLink,
                }
                : {}),
        };
    }

    async resetPassword(dto: ResetPasswordDto) {
        if (dto.new_password !== dto.confirm_password) {
            throw new BadRequestException('New passwords and confirm passwords do not match');
        }

        const token = dto.token;
        if (!token) throw new UnauthorizedException('Reset token missing');

        const { secret } = this.passwordResetConfig;

        let payload: any;
        try {
            payload = verifyJwt<any>(token, secret);
        } catch {
            throw new UnauthorizedException('Invalid or expired reset token');
        }

        if (
            payload?.type !== 'password_reset'
            || typeof payload?.sub !== 'number'
            || typeof payload?.pvh !== 'string'
            || typeof payload?.prv !== 'number'
        ) {
            throw new UnauthorizedException('Invalid reset token payload');
        }

        const userId = payload.sub;
        const user = await this.userModel.findByPk(userId);
        if (!user) throw new UnauthorizedException('User not found');
        this.enforceRateLimit(this.resetPasswordRate, String(user.id), 'Reset password');

        const currentPasswordVersionHash = createHash('sha256')
            .update(user.password_hash)
            .digest('hex');
        if (currentPasswordVersionHash !== payload.pvh) {
            throw new UnauthorizedException(
                'Reset token is already used or no longer valid',
            );
        }
        if ((user.password_reset_version || 0) !== payload.prv) {
            throw new UnauthorizedException(
                'Reset token is no longer latest. Please use the newest reset link.',
            );
        }

        const password_hash = await hashPassword(dto.new_password);
        user.password_hash = password_hash;
        user.password_reset_version = (user.password_reset_version || 0) + 1;
        await user.save();

        // Notify user that password has been reset.
        // Do not fail the reset flow if mail sending fails.
        try {
            const resetSuccessHtml = await renderPasswordResetSuccessEmailHtml({
                firstName: user.first_name,
            });
            await sendMail({
                config: this.mailConfig,
                to: user.email,
                subject: 'Your password was reset',
                html: resetSuccessHtml,
            });
        } catch (error: any) {
            const mailErrorMessage = error?.message || 'Unknown mail error';
            this.logger.error(
                `Password reset email send failed for ${user.email}: ${mailErrorMessage}`,
            );
        }

        return {
            user: publicUser(user),
            message: 'Password reset successfully',
        };
    }

    async changePassword(authHeader: string | undefined, dto: ChangePasswordDto) {
        if (dto.new_password !== dto.confirm_password) {
            throw new BadRequestException('New passwords and confirm passwords do not match');
        }

        const accessToken = this.extractBearerToken(authHeader);

        let payload: JwtAccessPayload;
        try {
            payload = verifyJwt<JwtAccessPayload>(
                accessToken,
                this.jwtConfig.accessSecret,
            );
        } catch {
            throw new UnauthorizedException('Invalid access token');
        }

        const userId = payload.sub;
        const user = await this.userModel.findByPk(userId);
        if (!user) throw new UnauthorizedException('User not found');

        const oldPasswordOk = await comparePassword(dto.old_password, user.password_hash);
        if (!oldPasswordOk) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        const sameAsOld = await comparePassword(dto.new_password, user.password_hash);
        if (sameAsOld) {
            throw new BadRequestException('New password must be different from current password');
        }

        const password_hash = await hashPassword(dto.new_password);
        user.password_hash = password_hash;
        user.password_reset_version = (user.password_reset_version || 0) + 1;
        await user.save();

        // Revoke active refresh tokens so all sessions must log in again.
        await this.rotateRefreshTokensForUser(user.id);

        // Notify user about password change. Do not fail password change flow
        // if email sending has transient SMTP issues.
        try {
            const changedHtml = await renderPasswordChangedEmailHtml({
                firstName: user.first_name,
            });
            await sendMail({
                config: this.mailConfig,
                to: user.email,
                subject: 'Your password was changed',
                html: changedHtml,
            });
        } catch (error: any) {
            const mailErrorMessage = error?.message || 'Unknown mail error';
            this.logger.error(
                `Password changed email send failed for ${user.email}: ${mailErrorMessage}`,
            );
        }

        return {
            user: publicUser(user),
            message: 'Password changed successfully',
        };
    }

    async updateProfile(authHeader: string | undefined, dto: UpdateUserDto) {
        const accessToken = this.extractBearerToken(authHeader);

        let payload: JwtAccessPayload;
        try {
            payload = verifyJwt<JwtAccessPayload>(
                accessToken,
                this.jwtConfig.accessSecret,
            );
        } catch {
            throw new UnauthorizedException('Invalid access token');
        }

        const userId = payload.sub;
        const user = await this.userModel.findByPk(userId);
        if (!user) throw new UnauthorizedException('User not found');

        if (dto.first_name !== undefined) user.first_name = dto.first_name;
        if (dto.last_name !== undefined) user.last_name = dto.last_name;
        if (dto.country_code !== undefined) user.country_code = dto.country_code;
        if (dto.phone_number !== undefined) user.phone_number = dto.phone_number;

        await user.save();

        return {
            user: publicUser(user),
            message: 'Profile updated successfully',
        };
    }
}
