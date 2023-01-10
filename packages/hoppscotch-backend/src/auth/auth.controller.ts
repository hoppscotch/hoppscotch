import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { signInMagicDto } from './dto/signin-magic.dto';
import { verifyMagicDto } from './dto/verify-magic.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  async signIn(@Body() authData: signInMagicDto) {
    return this.authService.signIn(authData.email);
  }

  //TODO: set expiresOn to cookies
  @Post('verify')
  async verify(@Body() data: verifyMagicDto, @Res() res: Response) {
    const authTokens = await this.authService.verify(data);
    res.cookie('access_token', authTokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    res.cookie('refresh_token', authTokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    res.status(HttpStatus.OK).json({
      message: 'Successfully logged in',
    });
  }
}
