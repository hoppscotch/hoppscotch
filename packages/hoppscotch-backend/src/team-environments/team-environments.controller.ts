import {
  Controller,
  Get,
  HttpStatus,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PATAuthGuard } from 'src/guards/rest-pat-auth.guard';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { TeamEnvironmentsService } from './team-environments.service';
import * as E from 'fp-ts/Either';
import { throwHTTPErr } from 'src/utils';
import { AccessTokenInterceptor } from 'src/interceptors/access-token.interceptor';
@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'environment', version: '1' })
export class TeamEnvironmentsController {
  constructor(
    private readonly teamEnvironmentsService: TeamEnvironmentsService,
  ) {}

  @Get(':id')
  @UseGuards(PATAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  async fetchEnvironments(@Param('id') id: string) {
    const res = await this.teamEnvironmentsService.getTeamEnvironment(id);

    if (E.isLeft(res))
      throwHTTPErr({
        message: res.left,
        statusCode: HttpStatus.NOT_FOUND,
      });
    return res.right;
  }
}
