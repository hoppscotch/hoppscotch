import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { map, Observable, catchError, throwError } from 'rxjs';
import { AccessTokenService } from 'src/access-token/access-token.service';
import * as E from 'fp-ts/Either';
import { PrismaService } from 'src/prisma/prisma.service';

export class AccessTokenInterceptor implements NestInterceptor {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(
    context: ExecutionContext,
    handler: CallHandler,
  ): Promise<Observable<any>> {
    console.log('Before...');
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException();
    }

    const userAccessToken = await this.accessTokenService.updateLastUsedforPAT(
      token,
    );
    // if (E.isLeft(userAccessToken)) throw new UnauthorizedException();
    console.log('cvdfvdfv', token);

    return handler.handle();
  }
}
