import { Controller, Post, UseGuards } from '@nestjs/common';
import { InfraTokenGuard } from 'src/guards/infra-token.guard';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';

@UseGuards(ThrottlerBehindProxyGuard, InfraTokenGuard)
@Controller({ path: 'api/v1/infra' })
export class UserExternalApiController {
  constructor() {}

  @Post('user-invitations')
  async userInvitations() {
    return 'user-invitations';
  }
}
