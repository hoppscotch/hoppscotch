import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { signInMagicDto } from './dto/signin-magic.dto';
import { verifyMagicDto } from './dto/verify-magic.dto';
import { Response } from 'express';
import * as E from 'fp-ts/Either';
import { authCookieHandler, throwHTTPErr } from 'src/utils';

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
    const authTokens = await this.authService.verify(data);
    if (E.isLeft(authTokens)) throwHTTPErr(authTokens.left);
    authCookieHandler(res, authTokens.right, false);
  }
}
