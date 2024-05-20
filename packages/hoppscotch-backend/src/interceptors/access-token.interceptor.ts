import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AccessTokenService } from 'src/access-token/access-token.service';
import * as E from 'fp-ts/Either';

@Injectable()
export class AccessTokenInterceptor implements NestInterceptor {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async intercept(
    context: ExecutionContext,
    handler: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException();
    }

    const userAccessToken = await this.accessTokenService.updateLastUsedforPAT(
      token,
    );
    if (E.isLeft(userAccessToken)) throw new UnauthorizedException();

    return handler.handle();
  }
}
