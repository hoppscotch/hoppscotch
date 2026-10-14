import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_NO_TEAM_ID,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';
import { TeamService } from '../team.service';

/**
 * Invitees get a Team back so the invite screen can show the name.
 * Members, envs and other invites still need a real membership.
 * Admins pass anyway, the dashboard isn't on the team.
 */
@Injectable()
export class GqlTeamResourceGuard implements CanActivate {
  constructor(private readonly teamService: TeamService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlExecCtx = GqlExecutionContext.create(context);
    const { req, headers } = gqlExecCtx.getContext();
    const user = headers ? headers.user : req?.user;

    if (user == undefined) throw new Error(BUG_AUTH_NO_USER_CTX);

    // dashboard reads this without joining the team
    if (user.isAdmin) return true;

    const parent = gqlExecCtx.getRoot<{ id?: string }>();
    const teamID = parent?.id;
    if (!teamID) throw new Error(BUG_TEAM_NO_TEAM_ID);

    const teamMember = await this.teamService.getTeamMember(teamID, user.uid);
    if (!teamMember) throw new Error(TEAM_MEMBER_NOT_FOUND);

    return true;
  }
}
