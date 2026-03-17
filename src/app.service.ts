import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    console.log(process.env.APP_PORT);
    return 'Hello this is my Find Jobs Extension Backend FHAAAAAAAAAAA 😱!';
  }
}
