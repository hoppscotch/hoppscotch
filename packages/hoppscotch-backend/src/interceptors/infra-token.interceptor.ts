import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { INFRA_TOKEN_NOT_FOUND } from 'src/errors';
import { InfraTokenService } from 'src/infra-token/infra-token.service';

@Injectable()
export class InfraTokenInterceptor implements NestInterceptor {
  constructor(private readonly infraTokenService: InfraTokenService) {}

  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException(INFRA_TOKEN_NOT_FOUND);
    }

    const token = authHeader.split(' ')[1];

    this.infraTokenService.updateLastUsedOn(token);

    return handler.handle();
  }
}
