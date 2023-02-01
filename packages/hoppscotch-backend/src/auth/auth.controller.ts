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
import { SignInMagicDto } from './dto/signin-magic.dto';
import { VerifyMagicDto } from './dto/verify-magic.dto';
import { Response } from 'express';
import * as E from 'fp-ts/Either';
import { RTJwtAuthGuard } from './guards/rt-jwt-auth.guard';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { RTCookie } from 'src/decorators/rt-cookie.decorator';
import { AuthGuard } from '@nestjs/passport';
import { authCookieHandler, throwHTTPErr } from './helper';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   ** Route to initiate magic-link auth for a users email
   */
  @Post('signin')
  async signInMagicLink(@Body() authData: SignInMagicDto) {
    const deviceIdToken = await this.authService.signInMagicLink(
      authData.email,
    );
    if (E.isLeft(deviceIdToken)) throwHTTPErr(deviceIdToken.left);
    return deviceIdToken.right;
  }

  /**
   ** Route to verify and sign in a valid user via magic-link
   */
  @Post('verify')
  async verify(@Body() data: VerifyMagicDto, @Res() res: Response) {
    const authTokens = await this.authService.verifyMagicLinkTokens(data);
    if (E.isLeft(authTokens)) throwHTTPErr(authTokens.left);
    authCookieHandler(res, authTokens.right, false);
  }

  /**
   ** Route to refresh auth tokens with Refresh Token Rotation
   * @see https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
   */
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

  /**
   ** Route to initiate SSO auth via Google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  /**
   ** Callback URL for Google SSO
   * @see https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow#how-it-works
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res) {
    const authTokens = await this.authService.generateAuthTokens(req.user.uid);
    if (E.isLeft(authTokens)) throwHTTPErr(authTokens.left);
    authCookieHandler(res, authTokens.right, true);
  }

  /**
   ** Route to initiate SSO auth via Github
   */
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Request() req) {}

  /**
   ** Callback URL for Github SSO
   * @see https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow#how-it-works
   */
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Request() req, @Res() res) {
    const authTokens = await this.authService.generateAuthTokens(req.user.uid);
    if (E.isLeft(authTokens)) throwHTTPErr(authTokens.left);
    authCookieHandler(res, authTokens.right, true);
  }

  /**
   ** Route to initiate SSO auth via Microsoft
   */
  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuth(@Request() req) {}

  /**
   ** Callback URL for Microsoft SSO
   * @see https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow#how-it-works
   */
  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuthRedirect(@Request() req, @Res() res) {
    const authTokens = await this.authService.generateAuthTokens(req.user.uid);
    if (E.isLeft(authTokens)) throwHTTPErr(authTokens.left);
    authCookieHandler(res, authTokens.right, true);
  }

  /**
   ** Log user out by clearing cookies containing auth tokens
   */
  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.status(200).send();
  }
}
