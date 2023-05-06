import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TeamInvitationService } from './team-invitation.service';
import { pipe, flow } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from 'src/user/user.model';
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
    return pipe(
      TE.Do,

      // Get execution context
      TE.bindW('gqlCtx', () => TE.of(GqlExecutionContext.create(context))),

      // Get user
      TE.bindW('user', ({ gqlCtx }) =>
        pipe(
          O.fromNullable(gqlCtx.getContext<{ user?: User }>().user),
          TE.fromOption(() => BUG_AUTH_NO_USER_CTX),
        ),
      ),

      // Get invite
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

      // Check if the emails match
      TE.chainW(
        TE.fromPredicate(
          ({ user, invite }) => user.email === invite.inviteeEmail,
          () => TEAM_INVITE_EMAIL_DO_NOT_MATCH,
        ),
      ),

      // Fold it to a promise
      TE.fold(throwErr, () => T.of(true)),
    )();
  }
}
