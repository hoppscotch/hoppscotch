import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { Request } from 'express';
import { RefreshTokenPayload } from 'src/types/AuthTokens';
import {
  COOKIES_NOT_FOUND,
  INVALID_REFRESH_TOKEN,
  USER_NOT_FOUND,
} from 'src/errors';
import * as O from 'fp-ts/Option';

@Injectable()
export class RTJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private usersService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const RTCookie = request.signedCookies['refresh_token'];
          if (!RTCookie) {
            throw new ForbiddenException(COOKIES_NOT_FOUND);
          }
          return RTCookie;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: RefreshTokenPayload) {
    if (!payload) throw new ForbiddenException(INVALID_REFRESH_TOKEN);

    const user = await this.usersService.findUserById(payload.sub);
    if (O.isNone(user)) {
      throw new UnauthorizedException(USER_NOT_FOUND);
    }

    return user.value;
  }
}
