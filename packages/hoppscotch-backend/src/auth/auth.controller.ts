import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { signInMagicDto } from './dto/signin-magic.dto';
import { verifyMagicDto } from './dto/verify-magic.dto';
import { Response } from 'express';
import * as E from 'fp-ts/Either';
import { authCookieHandler, throwHTTPErr } from 'src/utils';
import { RTJwtAuthGuard } from './guards/rt-jwt-auth.guard';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { RTCookie } from 'src/decorators/rt-cookie.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  async signIn(@Body() authData: signInMagicDto) {
    const data = await this.authService.signIn(authData.email);
    if (E.isLeft(data)) throwHTTPErr(data.left);
    return data.right;
  }

  @Post('verify')
  async verify(@Body() data: verifyMagicDto, @Res() res: Response) {
    const authTokens = await this.authService.verifyPasswordlessTokens(data);
    if (E.isLeft(authTokens)) throwHTTPErr(authTokens.left);
    authCookieHandler(res, authTokens.right, false);
  }

  @Get('refresh')
  @UseGuards(RTJwtAuthGuard)
  async refresh(
    @GqlUser() user: AuthUser,
    @RTCookie() refresh_token: string,
    @Res() res,
  ) {
    const newTokenPair = await this.authService.refreshAuthTokens(
      refresh_token,
      user,
    );
    if (E.isLeft(newTokenPair)) throwHTTPErr(newTokenPair.left);
    authCookieHandler(res, newTokenPair.right, false);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res) {
    const authTokens = await this.authService.generateAuthTokens(req.user.id);
    if (E.isLeft(authTokens)) throwHTTPErr(authTokens.left);
    authCookieHandler(res, authTokens.right, true);
  }
}
