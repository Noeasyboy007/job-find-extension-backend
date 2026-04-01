import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { ResponseBuilder } from 'src/common/helpers/response.builder';
import {
  RESUME_FILE_TYPE_VALIDATOR_REGEX,
  RESUME_MAX_FILE_BYTES,
} from 'src/common/constant/resume.constant';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { UploadResumeDto } from './dto/upload-resume.dto';
import { ResumesService } from './resumes.service';

const resumeUploadFilePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({ maxSize: RESUME_MAX_FILE_BYTES })
  .addFileTypeValidator({
    fileType: RESUME_FILE_TYPE_VALIDATOR_REGEX,
    skipMagicNumbersValidation: true,
  })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });

@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: RESUME_MAX_FILE_BYTES } }),
  )
  async upload(
    @Headers('authorization') authorization: string,
    @Body() body: UploadResumeDto,
    @UploadedFile(resumeUploadFilePipe) file: Express.Multer.File,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.resumesService.upload(
        authorization,
        file,
        body?.file_name,
      );
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.CREATED)
        .setMessage('Resume uploaded successfully')
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
      const data = await this.resumesService.findAll(authorization);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Resumes retrieved successfully')
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
      const data = await this.resumesService.findOne(authorization, id);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Resume retrieved successfully')
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

  @Patch(':id/file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: RESUME_MAX_FILE_BYTES } }),
  )
  async replaceFile(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(resumeUploadFilePipe) file: Express.Multer.File,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.resumesService.replaceFile(authorization, id, file);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Resume file replaced successfully')
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

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResumeDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.resumesService.update(authorization, id, dto);
      new ResponseBuilder<typeof data>()
        .setStatus(HttpStatus.OK)
        .setMessage('Resume updated successfully')
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.resumesService.remove(authorization, id);
      new ResponseBuilder<null>()
        .setStatus(HttpStatus.OK)
        .setMessage('Resume deleted successfully')
        .setData(null)
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
