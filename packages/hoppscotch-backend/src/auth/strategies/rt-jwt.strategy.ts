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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RTJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private usersService: UserService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
  (request: Request) => {
    // 1. Check cookie first
    const RTCookie = request.cookies?.['refresh_token'];
    if (RTCookie) {
      return RTCookie;
    }

    // 2. Fallback to Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {

    let bearerHeader: string | undefined;

    if (Array.isArray(authHeader)) {
      bearerHeader = authHeader.find(
        (value) => typeof value === 'string' && value.startsWith('Bearer '),
      );
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      bearerHeader = authHeader;
    }

    if (bearerHeader) {
      const parts = bearerHeader.split(' ');
      if (parts.length >= 2 && parts[1]) {
        return parts[1];
      }
    }
    console.error('Refresh token not found in cookie or Authorization header');
    throw new ForbiddenException(COOKIES_NOT_FOUND);
  },
]),
      secretOrKey: configService.get('INFRA.JWT_SECRET'),
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
