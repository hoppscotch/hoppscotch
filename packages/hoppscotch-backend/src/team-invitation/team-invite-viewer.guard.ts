import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TeamInvitationService } from './team-invitation.service';
import * as O from 'fp-ts/Option';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_NO_INVITE_FOUND,
  TEAM_MEMBER_NOT_FOUND,
} from 'src/errors';
import { throwErr } from 'src/utils';
import { TeamService } from 'src/team/team.service';

/**
 * This guard only allows user to execute the resolver
 * 1. If user is invitee, allow
 * 2. Or else, if user is team member, allow
 * 
 * TLDR: Allow if user is invitee or team member
 */
@Injectable()
export class TeamInviteViewerGuard implements CanActivate {
  constructor(
    private readonly teamInviteService: TeamInvitationService,
    private readonly teamService: TeamService,
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

    // Check if the user and the invite email match, else if user is a team member
    if (
      user.email?.toLowerCase() !== invitation.value.inviteeEmail.toLowerCase()
    ) {
      const teamMember = await this.teamService.getTeamMember(
        invitation.value.teamID,
        user.uid,
      );

      if (!teamMember) throwErr(TEAM_MEMBER_NOT_FOUND);
    }

    return true;
  }
}
