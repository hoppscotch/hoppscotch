import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenService } from 'src/access-token/access-token.service';
import * as E from 'fp-ts/Either';
import { DateTime } from 'luxon';
import { ACCESS_TOKEN_EXPIRED, ACCESS_TOKEN_INVALID } from 'src/errors';
import { createCLIErrorResponse } from 'src/access-token/helper';
@Injectable()
export class PATAuthGuard implements CanActivate {
  constructor(private accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new BadRequestException(
        createCLIErrorResponse(ACCESS_TOKEN_INVALID),
      );
    }

    const userAccessToken = await this.accessTokenService.getUserPAT(token);
    if (E.isLeft(userAccessToken))
      throw new BadRequestException(
        createCLIErrorResponse(ACCESS_TOKEN_INVALID),
      );
    request.user = userAccessToken.right.user;

    const accessToken = userAccessToken.right;
    if (accessToken.expiresOn === null) return true;

    const today = DateTime.now().toISO();
    if (accessToken.expiresOn.toISOString() > today) return true;

    throw new BadRequestException(
      createCLIErrorResponse(ACCESS_TOKEN_EXPIRED),
    );
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
