import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AdminService } from 'src/admin/admin.service';
import { InfraTokenGuard } from 'src/guards/infra-token.guard';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { GetUserInvitationResponse } from './request-response.dto';
import { OffsetPaginationArgs } from 'src/types/input-types.args';

@UseGuards(ThrottlerBehindProxyGuard, InfraTokenGuard)
@Controller({ path: 'api/v1/infra' })
export class UserExternalApiController {
  constructor(private adminService: AdminService) {}

  @Get('user-invitations')
  async createUserInvitation(@Query() paginationQuery: OffsetPaginationArgs) {
    const pendingInvitedUsers = await this.adminService.fetchInvitedUsers(
      paginationQuery,
    );

    return plainToInstance(GetUserInvitationResponse, pendingInvitedUsers, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }
}
