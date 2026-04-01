import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { MapFormFieldsDto } from './dto/map-form-fields.dto';
import { FormAutofillService } from './form-autofill.service';

@Controller('form-autofill')
export class FormAutofillController {
  constructor(private readonly formAutofillService: FormAutofillService) {}

  /**
   * Map visible application form fields to the user's active parsed resume via LLM.
   * POST /form-autofill/map
   */
  @Post('map')
  @HttpCode(HttpStatus.OK)
  async map(
    @Headers('authorization') authorization: string,
    @Body() body: MapFormFieldsDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.formAutofillService.mapFormFields(authorization, body);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage(
          data.fills.length
            ? `Prepared ${data.fills.length} field value(s) from your resume`
            : 'No confident field matches from your resume',
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
}
