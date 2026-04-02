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
  Query,
} from '@nestjs/common';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { IntakeJobDto } from './dto/intake-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs.query.dto';
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
      const duplicate = Boolean(data.already_existed);
      new ResponseBuilder<typeof data>()
        .setStatus(duplicate ? HttpStatus.OK : HttpStatus.CREATED)
        .setMessage(
          duplicate
            ? 'This job is already in your dashboard.'
            : 'Job captured successfully',
        )
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
    @Query() query: ListJobsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobsService.findAll(authorization, query);
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

  @Post(':id/retry-structure')
  @HttpCode(HttpStatus.OK)
  async retryStructure(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobsService.retryStructure(authorization, id);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Job structuring re-queued')
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
