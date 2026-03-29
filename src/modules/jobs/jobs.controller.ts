import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  Headers,
} from '@nestjs/common';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { IntakeJobDto } from './dto/intake-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Post('intake')
  @HttpCode(HttpStatus.CREATED)
  async intake(
    @Headers('authorization') authorization: string,
    @Body() body: IntakeJobDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobsService.intake(authorization, body);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.CREATED)
        .setMessage('Job captured successfully')
        .setData(data)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<null>().setError(error).build(res);
      }
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobsService.findAll(authorization);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Jobs retrieved successfully')
        .setData(data)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
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
      const data = await this.jobsService.findOne(authorization, id);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Job retrieved successfully')
        .setData(data)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<null>().setError(error).build(res);
      }
    }
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateJobStatusDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobsService.updateStatus(authorization, id, body);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Job status updated successfully')
        .setData(data)
        .build(res);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        res.status(error.getStatus()).json(response);
      } else {
        new ResponseBuilder<null>().setError(error).build(res);
      }
    }
  }
}
