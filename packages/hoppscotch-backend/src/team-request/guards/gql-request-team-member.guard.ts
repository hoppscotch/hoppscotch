import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { TeamRequestService } from '../team-request.service';
import { TeamService } from '../../team/team.service';
import { User } from '../../user/user.model';
import { Reflector } from '@nestjs/core';
import { TeamMemberRole } from '../../team/team.model';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_REQ_NO_REQ_ID,
  TEAM_REQ_NOT_REQUIRED_ROLE,
  TEAM_REQ_NOT_MEMBER,
} from 'src/errors';
import { throwErr } from 'src/utils';

@Injectable()
export class GqlRequestTeamMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamRequestService: TeamRequestService,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireRoles = this.reflector.get<TeamMemberRole[]>(
      'requiresTeamRole',
      context.getHandler(),
    );

    const gqlExecCtx = GqlExecutionContext.create(context);

    const { user } = gqlExecCtx.getContext().req;
    if (!user) throw new Error(BUG_AUTH_NO_USER_CTX);

    const { requestID } = gqlExecCtx.getArgs<{ requestID: string }>();
    if (!requestID) throw new Error(BUG_TEAM_REQ_NO_REQ_ID);

    const team = await this.teamRequestService.getTeamOfRequestFromID(
      requestID,
    );

    const member =
      (await this.teamService.getTeamMember(team.id, user.uid)) ??
      throwErr(TEAM_REQ_NOT_MEMBER);

    if (requireRoles) {
      if (requireRoles.includes(member.role)) {
        return true;
      } else {
        throw new Error(TEAM_REQ_NOT_REQUIRED_ROLE);
      }
    }

    if (member) return true;

    throw new Error(TEAM_REQ_NOT_MEMBER);
  }
}
