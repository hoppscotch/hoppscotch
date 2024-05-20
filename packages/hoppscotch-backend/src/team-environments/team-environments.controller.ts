import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PATAuthGuard } from 'src/guards/rest-pat-auth.guard';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'environment', version: '1' })
export class TeamEnvironmentsController {
  @Get(':id')
  @UseGuards(PATAuthGuard)
  async fetchEnvironments(@Param('id') id: string) {
    return true;
  }
}
