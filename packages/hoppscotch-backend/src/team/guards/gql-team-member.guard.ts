import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamService } from '../team.service';
import { TeamAccessRole } from '../team.model';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  TEAM_NOT_REQUIRED_ROLE,
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_NO_REQUIRE_TEAM_ROLE,
  BUG_TEAM_NO_TEAM_ID,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';

@Injectable()
export class GqlTeamMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireRoles = this.reflector.get<TeamAccessRole[]>(
      'requiresTeamRole',
      context.getHandler(),
    );
    if (!requireRoles) throw new Error(BUG_TEAM_NO_REQUIRE_TEAM_ROLE);

    const gqlExecCtx = GqlExecutionContext.create(context);
    const { req, headers } = gqlExecCtx.getContext();
    const user = headers ? headers.user : req.user;

    if (user == undefined) throw new Error(BUG_AUTH_NO_USER_CTX);

    const { teamID } = gqlExecCtx.getArgs<{ teamID: string }>();
    if (!teamID) throw new Error(BUG_TEAM_NO_TEAM_ID);

    const teamMember = await this.teamService.getTeamMember(teamID, user.uid);
    if (!teamMember) throw new Error(TEAM_MEMBER_NOT_FOUND);

    if (requireRoles.includes(teamMember.role)) return true;

    throw new Error(TEAM_NOT_REQUIRED_ROLE);
  }
}
