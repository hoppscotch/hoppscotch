import { Injectable } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { POSTHOG_CLIENT_NOT_INITIALIZED } from 'src/errors';
import { throwErr } from 'src/utils';

@Injectable()
export class PostHogService {
  private postHogClient: PostHog;
  private POSTHOG_API_KEY = 'phc_9CipPajQC22mSkk2wxe2TXsUA0Ysyupe8dt5KQQELqx';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    if (this.configService.get('INFRA.ALLOW_ANALYTICS_COLLECTION') === 'true') {
      console.log('Initializing PostHog');
      this.postHogClient = new PostHog(this.POSTHOG_API_KEY, {
        host: 'https://eu.posthog.com',
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleCron() {
    if (this.configService.get('INFRA.ALLOW_ANALYTICS_COLLECTION') === 'true') {
      await this.capture();
    }
  }

  async capture() {
    if (!this.postHogClient) {
      throwErr(POSTHOG_CLIENT_NOT_INITIALIZED);
    }

    this.postHogClient.capture({
      distinctId: this.configService.get('INFRA.ANALYTICS_USER_ID'),
      event: 'sh_instance',
      properties: {
        type: 'COMMUNITY',
        total_user_count: await this.prisma.user.count(),
        total_workspace_count: await this.prisma.team.count(),
        version: this.configService.get('npm_package_version'),
      },
    });
    console.log('Sent event to PostHog');
  }
}
