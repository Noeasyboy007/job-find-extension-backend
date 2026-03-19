import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { LogoutDto } from './dto/logout.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignUpDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignUpDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.signup(dto);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.CREATED)
        .setMessage('Signup successful')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.login(dto);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.OK)
        .setMessage('Login successful')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.refresh(dto);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.OK)
        .setMessage('Token refreshed')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: LogoutDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.logout(dto);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.OK)
        .setMessage('Logout successful')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const user = await this.authService.me(authorization);
      new ResponseBuilder<typeof user>()
        .setStatus(HttpStatus.OK)
        .setMessage('Current user retrieved successfully')
        .setData(user)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.verifyEmail(token);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.OK)
        .setMessage('Verification processed')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.resendVerification(dto);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.OK)
        .setMessage('Verification email request processed')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.forgotPassword(dto);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.OK)
        .setMessage('Password reset request processed')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.authService.resetPassword(dto);
      new ResponseBuilder<typeof result>()
        .setStatus(HttpStatus.OK)
        .setMessage('Password reset successfully')
        .setData(result)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<any>().setError(error).build(res);
      }
    }
  }
}

