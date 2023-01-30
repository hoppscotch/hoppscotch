import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessTokenPayload } from 'src/types/AuthTokens';
import { UserService } from 'src/user/user.service';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import * as O from 'fp-ts/Option';
import {
  COOKIES_NOT_FOUND,
  INVALID_ACCESS_TOKEN,
  USER_NOT_FOUND,
} from 'src/errors';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private usersService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const ATCookie = request.signedCookies['access_token'];
          if (!ATCookie) {
            throw new ForbiddenException(COOKIES_NOT_FOUND);
          }
          return ATCookie;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: AccessTokenPayload) {
    if (!payload) throw new ForbiddenException(INVALID_ACCESS_TOKEN);

    const user = await this.usersService.findUserById(payload.sub);
    if (O.isNone(user)) {
      throw new UnauthorizedException(USER_NOT_FOUND);
    }

    return user.value;
  }
}
