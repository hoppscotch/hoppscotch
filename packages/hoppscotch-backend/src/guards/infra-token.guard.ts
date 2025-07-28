import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  INFRA_TOKEN_EXPIRED,
  INFRA_TOKEN_HEADER_MISSING,
  INFRA_TOKEN_INVALID_TOKEN,
} from 'src/errors';

@Injectable()
export class InfraTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers['authorization'];

    if (!authorization)
      throw new UnauthorizedException(INFRA_TOKEN_HEADER_MISSING);

    if (!authorization.startsWith('Bearer '))
      throw new UnauthorizedException(INFRA_TOKEN_INVALID_TOKEN);

    const token = authorization.split(' ')[1];

    if (!token) throw new UnauthorizedException(INFRA_TOKEN_INVALID_TOKEN);

    const infraToken = await this.prisma.infraToken.findUnique({
      where: { token },
    });

    if (infraToken === null)
      throw new UnauthorizedException(INFRA_TOKEN_INVALID_TOKEN);

    // Check if token has expired (if expiresOn is set)
    if (infraToken.expiresOn && new Date() > infraToken.expiresOn) {
      throw new UnauthorizedException(INFRA_TOKEN_EXPIRED);
    }

    return true;
  }
}
