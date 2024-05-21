import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenService } from 'src/access-token/access-token.service';
import * as E from 'fp-ts/Either';
import { DateTime } from 'luxon';
@Injectable()
export class PATAuthGuard implements CanActivate {
  constructor(private accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const userAccessToken = await this.accessTokenService.getUserPAT(token);
      if (E.isLeft(userAccessToken)) throw new UnauthorizedException();

      const accessToken = userAccessToken.right;
      if (accessToken.expiresOn === null) return true;

      const today = DateTime.now().toISO();
      if (accessToken.expiresOn.toISOString() > today) return true;

      return false;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
