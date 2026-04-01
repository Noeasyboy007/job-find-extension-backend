import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { GenerateOutreachDto } from './dto/generate-outreach.dto';
import { ListOutreachQueryDto } from './dto/list-outreach.query.dto';
import { UpdateOutreachDto } from './dto/update-outreach.dto';
import { OutreachService } from './outreach.service';

@Controller('outreach')
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @Headers('authorization') authorization: string,
    @Body() body: GenerateOutreachDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.outreachService.generate(authorization, body);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.ACCEPTED)
        .setMessage('Outreach generation queued')
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

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Headers('authorization') authorization: string,
    @Query() query: ListOutreachQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!query.job_id) {
        res.status(HttpStatus.BAD_REQUEST).json({
          is_error: true,
          status: 400,
          message: 'job_id query parameter is required',
        });
        return;
      }
      const data = await this.outreachService.findAllForJob(authorization, query.job_id);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Outreach messages retrieved')
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.outreachService.findOne(authorization, id);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Outreach message retrieved')
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

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOutreachDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.outreachService.update(authorization, id, body);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Outreach message updated')
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
