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
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { ReanalyzeJobDto } from './dto/reanalyze-job.dto';
import { JobAnalysisService } from './job-analysis.service';

@Controller('job-analysis')
export class JobAnalysisController {
  constructor(private readonly jobAnalysisService: JobAnalysisService) {}

  @Post('reanalyze')
  @HttpCode(HttpStatus.ACCEPTED)
  async reanalyze(
    @Headers('authorization') authorization: string,
    @Body() body: ReanalyzeJobDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobAnalysisService.enqueueAnalyze(
        authorization,
        body.jobId,
      );
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.ACCEPTED)
        .setMessage('Job analysis re-queued')
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

  @Get(':jobId')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @Headers('authorization') authorization: string,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobAnalysisService.getByJobId(authorization, jobId);
      if (!data) {
        new ResponseBuilder<null>()
          .setStatus(HttpStatus.OK)
          .setMessage('No analysis yet for this job')
          .setData(null as unknown as null)
          .build(res);
        return;
      }
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Job analysis retrieved successfully')
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

  @Post(':jobId/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  async analyze(
    @Headers('authorization') authorization: string,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.jobAnalysisService.enqueueAnalyze(authorization, jobId);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.ACCEPTED)
        .setMessage('Job analysis queued')
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
