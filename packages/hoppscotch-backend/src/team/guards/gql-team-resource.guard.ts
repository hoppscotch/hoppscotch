import { Injectable } from '@nestjs/common';
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
export class GqlTeamResourceGuard {
  constructor(private readonly teamService: TeamService) {}

  // @UseGuards on ResolveField does not run in this app.
  // resolvers have to call this themselves.
  async assertCanRead(
    user: { uid: string; isAdmin?: boolean } | null | undefined,
    teamID: string | null | undefined,
  ): Promise<void> {
    if (user == undefined) throw new Error(BUG_AUTH_NO_USER_CTX);

    // dashboard reads this without joining the team
    if (user.isAdmin) return;

    if (!teamID) throw new Error(BUG_TEAM_NO_TEAM_ID);

    const teamMember = await this.teamService.getTeamMember(teamID, user.uid);
    if (!teamMember) throw new Error(TEAM_MEMBER_NOT_FOUND);
  }
}
