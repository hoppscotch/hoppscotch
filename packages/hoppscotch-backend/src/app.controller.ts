import { Controller, Get, UseGuards } from '@nestjs/common';
import { ThrottlerBehindProxyGuard } from './guards/throttler-behind-proxy.guard';

@Controller('ping')
@UseGuards(ThrottlerBehindProxyGuard)
export class AppController {
  @Get()
  ping(): string {
    return 'Success';
  }
}
