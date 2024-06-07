import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { AccessTokenService } from 'src/access-token/access-token.service';
import * as E from 'fp-ts/Either';
import { ACCESS_TOKEN_NOT_FOUND } from 'src/errors';

@Injectable()
export class AccessTokenInterceptor implements NestInterceptor {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      throw new BadRequestException(ACCESS_TOKEN_NOT_FOUND);
    }

    return handler.handle().pipe(
      map(async (data) => {
        const userAccessToken =
          await this.accessTokenService.updateLastUsedForPAT(token);
        if (E.isLeft(userAccessToken))
          throw new BadRequestException(userAccessToken.left);

        return data;
      }),
    );
  }
}
