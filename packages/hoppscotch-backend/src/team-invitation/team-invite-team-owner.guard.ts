import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TeamService } from 'src/team/team.service';
import { TeamInvitationService } from './team-invitation.service';
import * as O from 'fp-ts/Option';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_NO_INVITE_FOUND,
  TEAM_MEMBER_NOT_FOUND,
  TEAM_NOT_REQUIRED_ROLE,
} from 'src/errors';
import { throwErr } from 'src/utils';
import { TeamMemberRole } from 'src/team/team.model';

/**
 * This guard only allows team owner to execute the resolver
 */
@Injectable()
export class TeamInviteTeamOwnerGuard implements CanActivate {
  constructor(
    private readonly teamService: TeamService,
    private readonly teamInviteService: TeamInvitationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get GQL context
    const gqlExecCtx = GqlExecutionContext.create(context);

    // Get user
    const { user } = gqlExecCtx.getContext().req;
    if (!user) throwErr(BUG_AUTH_NO_USER_CTX);

    // Get the invite
    const { inviteID } = gqlExecCtx.getArgs<{ inviteID: string }>();
    if (!inviteID) throwErr(BUG_TEAM_INVITE_NO_INVITE_ID);

    const invitation = await this.teamInviteService.getInvitation(inviteID);
    if (O.isNone(invitation)) throwErr(TEAM_INVITE_NO_INVITE_FOUND);

    // Fetch team member details of this user
    const teamMember = await this.teamService.getTeamMember(
      invitation.value.teamID,
      user.uid,
    );

    if (!teamMember) throwErr(TEAM_MEMBER_NOT_FOUND);
    if (teamMember.role !== TeamMemberRole.OWNER)
      throwErr(TEAM_NOT_REQUIRED_ROLE);

    return true;
  }
}
