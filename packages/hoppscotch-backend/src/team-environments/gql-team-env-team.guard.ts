import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import * as S from 'fp-ts/string';
import { pipe } from 'fp-ts/function';
import {
  getAnnotatedRequiredRoles,
  getGqlArg,
  getUserFromGQLContext,
  throwErr,
} from 'src/utils';
import { TeamEnvironmentsService } from './team-environments.service';
import {
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_ENV_GUARD_NO_ENV_ID,
  BUG_TEAM_ENV_GUARD_NO_REQUIRE_ROLES,
  TEAM_ENVIRONMENT_NOT_TEAM_MEMBER,
  TEAM_ENVIRONMENT_NOT_FOUND,
} from 'src/errors';
import { TeamService } from 'src/team/team.service';

/**
 * A guard which checks whether the caller of a GQL Operation
 * is in the team which owns the environment.
 * This guard also requires the RequireRole decorator for access control
 */
@Injectable()
export class GqlTeamEnvTeamGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamEnvironmentService: TeamEnvironmentsService,
    private readonly teamService: TeamService,
  ) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    return pipe(
      TE.Do,

      TE.bindW('requiredRoles', () =>
        pipe(
          getAnnotatedRequiredRoles(this.reflector, context),
          TE.fromOption(() => BUG_TEAM_ENV_GUARD_NO_REQUIRE_ROLES),
        ),
      ),

      TE.bindW('user', () =>
        pipe(
          getUserFromGQLContext(context),
          TE.fromOption(() => BUG_AUTH_NO_USER_CTX),
        ),
      ),

      TE.bindW('envID', () =>
        pipe(
          getGqlArg('id', context),
          O.fromPredicate(S.isString),
          TE.fromOption(() => BUG_TEAM_ENV_GUARD_NO_ENV_ID),
        ),
      ),

      TE.bindW('membership', ({ envID, user }) =>
        pipe(
          this.teamEnvironmentService.getTeamEnvironment(envID),
          TE.fromTaskOption(() => TEAM_ENVIRONMENT_NOT_FOUND),
          TE.chainW((env) =>
            pipe(
              this.teamService.getTeamMemberTE(env.teamID, user.uid),
              TE.mapLeft(() => TEAM_ENVIRONMENT_NOT_TEAM_MEMBER),
            ),
          ),
        ),
      ),

      TE.map(({ membership, requiredRoles }) =>
        requiredRoles.includes(membership.role),
      ),

      TE.getOrElse(throwErr),
    )();
  }
}
