
import {
    BadRequestException,
    ConflictException,
    HttpException,
    HttpStatus,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

export interface ApiResponse<T> {
    is_error: boolean;
    status: number;
    message: string;
    data?: T;
}

function handleError(this: any, error: any,) {
    if (error instanceof UnauthorizedException) {
        this.httpStatus = HttpStatus.UNAUTHORIZED;
    } else if (error instanceof ConflictException) {
        this.httpStatus = HttpStatus.CONFLICT;
    } else if (error instanceof BadRequestException) {
        this.httpStatus = HttpStatus.BAD_REQUEST;
    } else if (error instanceof NotFoundException) {
        this.httpStatus = HttpStatus.NOT_FOUND;
    } else {
        this.httpStatus = HttpStatus.BAD_REQUEST
    }
}



export class ResponseBuilder<T> {
    private readonly response: ApiResponse<T>;
    private readonly httpStatus: HttpStatus;

    constructor() {
        this.response = {
            is_error: false,
            status: 200,
            message: 'success',
        };
        this.httpStatus = HttpStatus.OK;
    }

    setStatus(status: number): this {
        this.response.status = status;
        return this;
    }

    setMessage(message: string): this {
        this.response.message = message;
        return this;
    }

    setData(data: T): this {
        this.response.data = data;
        return this;
    }

    setError(error: any): this {
        this.response.is_error = true;
        this.response.message = error.message;
        handleError.call(this, error);
        this.response.status = this.httpStatus;
        return this;
    }

    build(res): ApiResponse<T> {
        if (this.response.is_error) {
            throw new HttpException(this.response, this.httpStatus);
        }
        return res.status(this.response.status).json(this.response);
    }
}