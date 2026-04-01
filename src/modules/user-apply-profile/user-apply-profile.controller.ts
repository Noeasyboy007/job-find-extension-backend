import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { UpsertApplyProfileDto } from './dto/upsert-apply-profile.dto';
import { UserApplyProfileService } from './user-apply-profile.service';

@Controller('user-apply-profile')
export class UserApplyProfileController {
  constructor(private readonly profileService: UserApplyProfileService) {}

  /** GET /user-apply-profile */
  @Get()
  @HttpCode(HttpStatus.OK)
  async get(
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.profileService.getProfile(authorization);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage(data ? 'Apply profile loaded' : 'No apply profile found')
        .setData(data)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        new ResponseBuilder<null>().setError(error).build(res);
      }
    }
  }

  /** PUT /user-apply-profile */
  @Put()
  @HttpCode(HttpStatus.OK)
  async upsert(
    @Headers('authorization') authorization: string,
    @Body() body: UpsertApplyProfileDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.profileService.upsertProfile(authorization, body);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Apply profile saved successfully')
        .setData(data)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        new ResponseBuilder<null>().setError(error).build(res);
      }
    }
  }
}
