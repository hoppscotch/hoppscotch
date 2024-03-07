import { Controller, Get, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { InfraConfigService } from './infra-config.service';
import * as E from 'fp-ts/Either';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RESTAdminGuard } from 'src/admin/guards/rest-admin.guard';
import { RESTError } from 'src/types/RESTError';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import { throwHTTPErr } from 'src/utils';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'site', version: '1' })
export class SiteController {
  constructor(private infraConfigService: InfraConfigService) {}

  @Get('setup')
  @UseGuards(JwtAuthGuard, RESTAdminGuard)
  async fetchSetupInfo() {
    const status = await this.infraConfigService.get(
      InfraConfigEnum.IS_FIRST_TIME_INFRA_SETUP,
    );

    if (E.isLeft(status))
      throwHTTPErr(<RESTError>{
        message: status.left,
        statusCode: HttpStatus.NOT_FOUND,
      });
    return status.right;
  }

  @Put('setup')
  @UseGuards(JwtAuthGuard, RESTAdminGuard)
  async setSetupAsComplete() {
    const res = await this.infraConfigService.update(
      InfraConfigEnum.IS_FIRST_TIME_INFRA_SETUP,
      false.toString(),
      false,
    );

    if (E.isLeft(res))
      throwHTTPErr(<RESTError>{
        message: res.left,
        statusCode: HttpStatus.FORBIDDEN,
      });
    return res.right;
  }
}
