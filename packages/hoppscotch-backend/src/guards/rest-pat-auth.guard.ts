import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenService } from 'src/access-token/access-token.service';
import * as E from 'fp-ts/Either';
import { throwHTTPErr } from 'src/utils';

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
      // TODO: Check if token is valid (ie present in DB)
      const userAccessToken = await this.accessTokenService.getUserPAT(token);
      if (E.isLeft(userAccessToken)) throwHTTPErr(userAccessToken.left);
      console.log(userAccessToken);

      // TODO: Check if token is expired
      const accessToken = userAccessToken.right;
      if (accessToken.expiresOn === null) return true;

      const today = new Date();
      if (accessToken.expiresOn > today) return true;

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
