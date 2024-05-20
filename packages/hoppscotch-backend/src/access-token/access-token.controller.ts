import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import * as E from 'fp-ts/Either';
import { throwHTTPErr } from 'src/utils';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'access-tokens', version: '1' })
export class AccessTokenController {
  constructor(private readonly accessTokenService: AccessTokenService) {}

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
    const result = await this.accessTokenService.listAllUserPAT(
      user.uid,
      offset,
      limit,
    );

    if (E.isLeft(result)) throwHTTPErr(result.left);
    return result.right;
  }
}
