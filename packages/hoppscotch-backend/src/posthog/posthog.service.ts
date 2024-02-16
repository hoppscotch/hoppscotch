import { Injectable } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class PosthogService {
  private postHogClient: PostHog;
  private POSTHOG_API_KEY = 'phc_1RM0bUMCRRLIXDXsYFE2fWfrvh3udWb2OmiNN1DngRu';

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    if (this.configService.get('INFRA.ALLOW_ANALYTICS_COLLECTION') === 'true') {
      console.log('Initializing PostHog');
      // Instantiate PostHog client only if env variable is true
      this.postHogClient = new PostHog(this.POSTHOG_API_KEY, {
        host: 'https://eu.posthog.com',
      });
    }
  }

  // ToDo: Change expression to every week in the end
  @Cron(CronExpression.EVERY_5_SECONDS)
  async capture() {
    console.log('Sent event to PostHog');
    this.postHogClient.capture({
      distinctId: this.configService.get('INFRA.ANALYTICS_USER_ID'),
      event: 'sh_instance',
      properties: {
        type: 'COMMUNITY',
        total_user_count: await this.prismaService.user.count(),
        total_workspace_count: await this.prismaService.team.count(),
        version: this.configService.get('npm_package_version'),
      },
    });
  }
}
