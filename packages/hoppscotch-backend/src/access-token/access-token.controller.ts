import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import * as E from 'fp-ts/Either';
import { throwHTTPErr } from 'src/utils';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { PATAuthGuard } from 'src/guards/rest-pat-auth.guard';
import { AccessTokenInterceptor } from 'src/interceptors/access-token.interceptor';
import { TeamEnvironmentsService } from 'src/team-environments/team-environments.service';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import { ACCESS_TOKENS_INVALID_DATA_ID } from 'src/errors';
import { createCLIErrorResponse } from './helper';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'access-tokens', version: '1' })
export class AccessTokenController {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly teamCollectionService: TeamCollectionService,
    private readonly teamEnvironmentsService: TeamEnvironmentsService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createPAT(
    @GqlUser() user: AuthUser,
    @Body() createAccessTokenDto: CreateAccessTokenDto,
  ) {
    const result = await this.accessTokenService.createPAT(
      createAccessTokenDto,
      user,
    );
    if (E.isLeft(result)) throwHTTPErr(result.left);
    return result.right;
  }

  @Delete('revoke')
  @UseGuards(JwtAuthGuard)
  async deletePAT(@Query('id') id: string) {
    const result = await this.accessTokenService.deletePAT(id);

    if (E.isLeft(result)) throwHTTPErr(result.left);
    return result.right;
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async listAllUserPAT(
    @GqlUser() user: AuthUser,
    @Query('offset', ParseIntPipe) offset: number,
    @Query('limit', ParseIntPipe) limit: number,
  ) {
    return await this.accessTokenService.listAllUserPAT(
      user.uid,
      offset,
      limit,
    );
  }

  @Get('collection/:id')
  @UseGuards(PATAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  async fetchCollection(@GqlUser() user: AuthUser, @Param('id') id: string) {
    const res = await this.teamCollectionService.getCollectionForCLI(
      id,
      user.uid,
    );

    if (E.isLeft(res))
      throw new BadRequestException(
        createCLIErrorResponse(ACCESS_TOKENS_INVALID_DATA_ID),
      );
    return res.right;
  }

  @Get('environment/:id')
  @UseGuards(PATAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  async fetchEnvironment(@GqlUser() user: AuthUser, @Param('id') id: string) {
    const res = await this.teamEnvironmentsService.getTeamEnvironmentForCLI(
      id,
      user.uid,
    );

    if (E.isLeft(res))
      throw new BadRequestException(
        createCLIErrorResponse(ACCESS_TOKENS_INVALID_DATA_ID),
      );
    return res.right;
  }
}
