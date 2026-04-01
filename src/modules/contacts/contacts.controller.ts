import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * Run contact discovery for a job (returns cached result on subsequent calls).
   * POST /contacts/discover/:jobId
   */
  @Post('discover/:jobId')
  @HttpCode(HttpStatus.OK)
  async discover(
    @Headers('authorization') authorization: string,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.contactsService.discoverContacts(authorization, jobId);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage(
          data.from_cache
            ? 'Contacts retrieved from cache'
            : data.contacts.length
              ? `Found ${data.contacts.length} contact(s) in this job posting`
              : 'No contact information found in this job posting',
        )
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

  /**
   * List already-discovered contacts for a job.
   * GET /contacts?job_id=
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Headers('authorization') authorization: string,
    @Query('job_id', ParseIntPipe) jobId: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.contactsService.getContactsForJob(authorization, jobId);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Contacts retrieved')
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
