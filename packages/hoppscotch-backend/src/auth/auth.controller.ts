import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { signInMagicDto } from './dto/signin-magic.dto';
import { verifyMagicDto } from './dto/verify-magic.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  async signIn(@Body() authData: signInMagicDto) {
    return this.authService.signIn(authData.email);
  }
}
