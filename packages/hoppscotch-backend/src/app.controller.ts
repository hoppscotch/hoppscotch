import { Controller, Get } from '@nestjs/common';

@Controller('ping')
export class AppController {
  @Get()
  ping(): string {
    return 'Success';
  }
}
