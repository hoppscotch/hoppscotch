import { Controller, Get, UseGuards } from '@nestjs/common';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { InfraConfigService } from './infra-config.service';
import * as E from 'fp-ts/Either';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'site', version: '1' })
export class SiteController {
  constructor(private infraConfigService: InfraConfigService) {}
}
