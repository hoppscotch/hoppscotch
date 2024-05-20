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
import { TeamService } from 'src/team/team.service';
import { Reflector } from '@nestjs/core';
import { throwHTTPErr } from 'src/utils';
import { TeamMemberRole } from '@prisma/client';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_NO_REQUIRE_TEAM_ROLE,
  BUG_TEAM_NO_TEAM_ID,
} from 'src/errors';
@Injectable()
export class PATAuthGuard implements CanActivate {
  constructor(
    private accessTokenService: AccessTokenService,
    private readonly reflector: Reflector,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    const requireRoles = this.reflector.get<TeamMemberRole[]>(
      'requiresTeamRole',
      context.getHandler(),
    );
    if (!requireRoles)
      throwHTTPErr({ message: BUG_TEAM_NO_REQUIRE_TEAM_ROLE, statusCode: 400 });

    try {
      // Check if the PAT token is valid
      const userAccessToken = await this.accessTokenService.getUserPAT(token);
      if (E.isLeft(userAccessToken)) throw new UnauthorizedException();

      const accessToken = userAccessToken.right;
      if (accessToken.expiresOn === null) return true;

      const today = DateTime.now().toISO();
      if (accessToken.expiresOn.toISOString() > today) return true;

      // Check if user object is present in the request
      const { user } = request;
      if (user == undefined)
        throwHTTPErr({ message: BUG_AUTH_NO_USER_CTX, statusCode: 400 });

      // Check if teamID is present in the request
      const dataID = request.params.id;
      if (!teamID)
        throwHTTPErr({ message: BUG_TEAM_NO_TEAM_ID, statusCode: 400 });

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
