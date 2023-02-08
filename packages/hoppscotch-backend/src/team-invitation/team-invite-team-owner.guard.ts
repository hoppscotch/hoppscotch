import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { pipe } from 'fp-ts/function';
import { TeamService } from 'src/team/team.service';
import { TeamInvitationService } from './team-invitation.service';
import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_INVITE_NO_INVITE_ID,
  TEAM_INVITE_NO_INVITE_FOUND,
  TEAM_NOT_REQUIRED_ROLE,
} from 'src/errors';
import { User } from 'src/user/user.model';
import { throwErr } from 'src/utils';
import { TeamMemberRole } from 'src/team/team.model';

@Injectable()
export class TeamInviteTeamOwnerGuard implements CanActivate {
  constructor(
    private readonly teamService: TeamService,
    private readonly teamInviteService: TeamInvitationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return pipe(
      TE.Do,

      TE.bindW('gqlCtx', () => TE.of(GqlExecutionContext.create(context))),

      // Get the invite
      TE.bindW('invite', ({ gqlCtx }) =>
        pipe(
          O.fromNullable(gqlCtx.getArgs<{ inviteID?: string }>().inviteID),
          TE.fromOption(() => BUG_TEAM_INVITE_NO_INVITE_ID),
          TE.chainW((inviteID) =>
            pipe(
              this.teamInviteService.getInvitation(inviteID),
              TE.fromTaskOption(() => TEAM_INVITE_NO_INVITE_FOUND),
            ),
          ),
        ),
      ),

      TE.bindW('user', ({ gqlCtx }) =>
        pipe(
          gqlCtx.getContext().req.user,
          O.fromNullable,
          TE.fromOption(() => BUG_AUTH_NO_USER_CTX),
        ),
      ),

      TE.bindW('userMember', ({ invite, user }) =>
        this.teamService.getTeamMemberTE(invite.teamID, user.uid),
      ),

      TE.chainW(
        TE.fromPredicate(
          ({ userMember }) => userMember.role === TeamMemberRole.OWNER,
          () => TEAM_NOT_REQUIRED_ROLE,
        ),
      ),

      TE.fold(
        (err) => throwErr(err),
        () => T.of(true),
      ),
    )();
  }
}
