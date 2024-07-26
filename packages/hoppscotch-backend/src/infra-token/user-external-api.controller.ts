import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AdminService } from 'src/admin/admin.service';
import { InfraTokenGuard } from 'src/guards/infra-token.guard';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import {
  DeleteUserInvitationRequest,
  DeleteUserInvitationResponse,
  ExceptionResponse,
  GetUserInvitationResponse,
} from './request-response.dto';
import * as E from 'fp-ts/Either';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { throwHTTPErr } from 'src/utils';

@ApiTags('User Management API')
@UseGuards(ThrottlerBehindProxyGuard, InfraTokenGuard)
@Controller({ path: 'api/v1/infra' })
export class UserExternalApiController {
  constructor(private adminService: AdminService) {}

  @Get('user-invitations')
  @ApiSecurity('infra-token')
  @ApiOkResponse({
    description: 'Get pending user invitations',
    type: [GetUserInvitationResponse],
  })
  async createUserInvitation(@Query() paginationQuery: OffsetPaginationArgs) {
    const pendingInvitedUsers = await this.adminService.fetchInvitedUsers(
      paginationQuery,
    );

    return plainToInstance(GetUserInvitationResponse, pendingInvitedUsers, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  @Delete('user-invitations')
  @ApiSecurity('infra-token')
  @ApiOkResponse({
    description: 'Delete a pending user invitation',
    type: DeleteUserInvitationResponse,
  })
  @ApiBadRequestResponse({ type: ExceptionResponse })
  async deleteUserInvitation(@Body() dto: DeleteUserInvitationRequest) {
    const isDeleted = await this.adminService.revokeUserInvitations(
      dto.inviteeEmails,
    );

    if (E.isLeft(isDeleted)) {
      throwHTTPErr({
        message: isDeleted.left,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    return plainToInstance(
      DeleteUserInvitationResponse,
      { message: isDeleted.right },
      {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      },
    );
  }
}
