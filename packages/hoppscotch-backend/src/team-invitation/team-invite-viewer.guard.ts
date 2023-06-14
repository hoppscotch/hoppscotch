import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TeamInvitationService } from './team-invitation.service';
import { pipe, flow } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import * as O from 'fp-ts/Option';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_NOT_VALID_VIEWER,
  TEAM_INVITE_NO_INVITE_FOUND,
} from 'src/errors';
import { User } from 'src/user/user.model';
import { throwErr } from 'src/utils';
import { TeamService } from 'src/team/team.service';

@Injectable()
export class TeamInviteViewerGuard implements CanActivate {
  constructor(
    private readonly teamInviteService: TeamInvitationService,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return pipe(
      TE.Do,

      // Get GQL Context
      TE.bindW('gqlCtx', () => TE.of(GqlExecutionContext.create(context))),

      // Get user
      TE.bindW('user', ({ gqlCtx }) =>
        pipe(
          O.fromNullable(gqlCtx.getContext().req.user),
          TE.fromOption(() => BUG_AUTH_NO_USER_CTX),
        ),
      ),

      // Get the invite
      TE.bindW('invite', ({ gqlCtx }) =>
        pipe(
          O.fromNullable(gqlCtx.getArgs<{ inviteID?: string }>().inviteID),
          TE.fromOption(() => BUG_TEAM_INVITE_NO_INVITE_ID),
          TE.chainW(
            flow(
              this.teamInviteService.getInvitation,
              TE.fromTaskOption(() => TEAM_INVITE_NO_INVITE_FOUND),
            ),
          ),
        ),
      ),

      // Check if the user and the invite email match, else if we can resolver the user as a team member
      // any better solution ?
      TE.chainW(({ user, invite }) =>
        user.email?.toLowerCase() === invite.inviteeEmail.toLowerCase()
          ? TE.of(true)
          : pipe(
              this.teamService.getTeamMemberTE(invite.teamID, user.uid),
              TE.map(() => true),
            ),
      ),

      TE.mapLeft((e) =>
        e === 'team/member_not_found' ? TEAM_INVITE_NOT_VALID_VIEWER : e,
      ),

      TE.fold(throwErr, () => T.of(true)),
    )();
  }
}
