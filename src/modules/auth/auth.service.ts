import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { UserService } from '../users/user.service';
import { InjectModel } from '@nestjs/sequelize';
import { RefreshToken } from './models/refresh-token.entity';
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
    renderWelcomeEmailHtml,
    renderVerifyUserEmailHtml,
} from 'src/common/helpers/nodemailer.helper';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { ResendVerificationDto } from './dto/resend-verification.dto';

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
    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
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
        // Delegate user creation & password hashing to your existing UserService.
        // (UserService has uniqueness checks on email.)
        const user = await this.userService.create(dto as any);

        // In case someone signs up twice quickly and userService returns the same user,
        // we still ensure refresh tokens are clean.
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
            user: publicUser(user),
            message: 'Verification email sent. Please verify to activate your account.',
        };
    }

    async login(dto: LoginDto) {
        const user = await this.userService.findByEmail(dto.email);
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

        const user = await this.userService.findById(userId);
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
        const user = await this.userService.findById(userId);
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

        const user = await this.userService.findById(payload.sub);
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
        const user = await this.userService.findByEmail(email);

        // Prevent user enumeration: always return the same response message.
        if (!user || user.is_verified) {
            return {
                message: 'If your account exists, we sent a verification email.',
            };
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
        };
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const email = dto.email;
        const user = await this.userService.findByEmail(email);

        if (!user) {
            return {
                message: 'If your account exists, we sent a password reset email.',
            };
        }

        const { secret, expiresInSeconds } = this.passwordResetConfig;
        const token = signJwt(
            { type: 'password_reset', sub: user.id, email: user.email },
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
        };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const token = dto.token;
        if (!token) throw new UnauthorizedException('Reset token missing');

        const { secret } = this.passwordResetConfig;

        let payload: any;
        try {
            payload = verifyJwt<any>(token, secret);
        } catch {
            throw new UnauthorizedException('Invalid or expired reset token');
        }

        if (payload?.type !== 'password_reset' || typeof payload?.sub !== 'number') {
            throw new UnauthorizedException('Invalid reset token payload');
        }

        const userId = payload.sub;
        const user = await this.userService.findById(userId);
        if (!user) throw new UnauthorizedException('User not found');

        const password_hash = await hashPassword(dto.new_password);
        const updated = await this.userService.updatePasswordById(userId, password_hash);
        return {
            user: updated ? publicUser(updated) : publicUser(user),
            message: 'Password reset successfully',
        };
    }
}
