import { Controller, Get, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { InfraConfigService } from './infra-config.service';
import * as E from 'fp-ts/Either';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RESTAdminGuard } from 'src/admin/guards/rest-admin.guard';
import { throwHTTPErr } from 'src/auth/helper';
import { AuthError } from 'src/types/AuthError';
import { InfraConfigEnumForClient } from 'src/types/InfraConfig';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'site', version: '1' })
export class SiteController {
  constructor(private infraConfigService: InfraConfigService) {}

  @Get('setup')
  @UseGuards(JwtAuthGuard, RESTAdminGuard)
  async fetchSetupInfo() {
    const status = await this.infraConfigService.get(
      InfraConfigEnumForClient.IS_FIRST_TIME_INFRA_SETUP,
    );

    if (E.isLeft(status))
      throwHTTPErr(<AuthError>{
        message: status.left,
        statusCode: HttpStatus.NOT_FOUND,
      });
    return status.right;
  }

  @Put('setup')
  @UseGuards(JwtAuthGuard, RESTAdminGuard)
  async setSetupAsComplete() {
    const res = await this.infraConfigService.update(
      InfraConfigEnumForClient.IS_FIRST_TIME_INFRA_SETUP,
      true.toString(),
      false,
    );

    if (E.isLeft(res))
      throwHTTPErr(<AuthError>{
        message: res.left,
        statusCode: HttpStatus.FORBIDDEN,
      });
    return res.right;
  }
}
