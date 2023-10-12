import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TeamInvitationService } from './team-invitation.service';
import * as O from 'fp-ts/Option';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_EMAIL_DO_NOT_MATCH,
  TEAM_INVITE_NO_INVITE_FOUND,
} from 'src/errors';
import { throwErr } from 'src/utils';

/**
 * This guard only allows the invitee to execute the resolver
 *
 * REQUIRES GqlAuthGuard
 */
@Injectable()
export class TeamInviteeGuard implements CanActivate {
  constructor(private readonly teamInviteService: TeamInvitationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get GQL Context
    const gqlExecCtx = GqlExecutionContext.create(context);

    // Get user
    const { user } = gqlExecCtx.getContext().req;
    if (!user) throwErr(BUG_AUTH_NO_USER_CTX);

    // Get the invite
    const { inviteID } = gqlExecCtx.getArgs<{ inviteID: string }>();
    if (!inviteID) throwErr(BUG_TEAM_INVITE_NO_INVITE_ID);

    const invitation = await this.teamInviteService.getInvitation(inviteID);
    if (O.isNone(invitation)) throwErr(TEAM_INVITE_NO_INVITE_FOUND);

    if (
      user.email.toLowerCase() !== invitation.value.inviteeEmail.toLowerCase()
    ) {
      throwErr(TEAM_INVITE_EMAIL_DO_NOT_MATCH);
    }

    return true;
  }
}
