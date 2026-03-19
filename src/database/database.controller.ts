import {
    Controller,
    HttpCode,
    HttpException,
    HttpStatus,
    Post,
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { DatabaseService } from './database.service';

@Controller('database')
export class DatabaseController {
    constructor(private readonly databaseService: DatabaseService) { }

    @Post('sync')
    @HttpCode(HttpStatus.OK)
    async sync(@Res() res: Response): Promise<void> {
        try {
            const result = await this.databaseService.syncDatabaseIfAllowed();
            new ResponseBuilder<typeof result>()
                .setStatus(HttpStatus.OK)
                .setMessage('Database sync completed')
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

