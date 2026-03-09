import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('health')
@UseGuards(ThrottlerBehindProxyGuard)
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
