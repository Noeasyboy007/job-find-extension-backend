import {
    Controller,
    Patch,
    Body,
    Res,
    HttpCode,
    HttpStatus,
    HttpException,
    Param,
    ParseIntPipe,
    NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserService } from './user.service';
import { ResponseBuilder } from 'src/common/helpers/response.builder';
import { User } from '../models/user.entity';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

}
