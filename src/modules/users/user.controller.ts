import {
    Controller,
    Get,
    Post,
    Body,
    Res,
    HttpCode,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './models/user.entity';
import { ResponseBuilder } from 'src/common/helpers/response.builder';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() createUserDto: CreateUserDto,
        @Res() res: Response,
    ): Promise<void> {
        try {
            const user = await this.userService.create(createUserDto);
            new ResponseBuilder<User>()
                .setStatus(HttpStatus.CREATED)
                .setMessage('User created successfully')
                .setData(user)
                .build(res);
        } catch (error) {
            if (error instanceof HttpException) {
                const response = error.getResponse();
                res.status(error.getStatus()).json(response);
            } else {
                const responseBuilder = new ResponseBuilder<User>().setError(error);
                try {
                    responseBuilder.build(res);
                } catch (httpError) {
                    if (httpError instanceof HttpException) {
                        const response = httpError.getResponse();
                        res.status(httpError.getStatus()).json(response);
                    }
                }
            }
        }
    }

    @Get()
    async findAll(@Res() res: Response): Promise<void> {
        try {
            const users = await this.userService.findAll();
            new ResponseBuilder<User[]>()
                .setStatus(HttpStatus.OK)
                .setMessage('Users retrieved successfully')
                .setData(users)
                .build(res);
        } catch (error) {
            if (error instanceof HttpException) {
                const response = error.getResponse();
                res.status(error.getStatus()).json(response);
            } else {
                const responseBuilder = new ResponseBuilder<User[]>().setError(error);
                try {
                    responseBuilder.build(res);
                } catch (httpError) {
                    if (httpError instanceof HttpException) {
                        const response = httpError.getResponse();
                        res.status(httpError.getStatus()).json(response);
                    }
                }
            }
        }
    }
}
