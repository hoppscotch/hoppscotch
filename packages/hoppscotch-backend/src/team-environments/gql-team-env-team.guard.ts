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
import { GqlExecutionContext } from '@nestjs/graphql';
import * as E from 'fp-ts/Either';
import { TeamMemberRole } from '@prisma/client';

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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireRoles = this.reflector.get<TeamMemberRole[]>(
      'requiresTeamRole',
      context.getHandler(),
    );
    if (!requireRoles) throw new Error(BUG_TEAM_ENV_GUARD_NO_REQUIRE_ROLES);

    const gqlExecCtx = GqlExecutionContext.create(context);

    const { user } = gqlExecCtx.getContext().req;
    if (user == undefined) throw new Error(BUG_AUTH_NO_USER_CTX);

    const { id } = gqlExecCtx.getArgs<{ id: string }>();
    if (!id) throw new Error(BUG_TEAM_ENV_GUARD_NO_ENV_ID);

    const teamEnvironment =
      await this.teamEnvironmentService.getTeamEnvironment(id);
    if (E.isLeft(teamEnvironment)) throw new Error(TEAM_ENVIRONMENT_NOT_FOUND);

    const member = await this.teamService.getTeamMember(
      teamEnvironment.right.teamID,
      user.uid,
    );
    if (!member) throw new Error(TEAM_ENVIRONMENT_NOT_TEAM_MEMBER);

    return requireRoles.includes(member.role);
  }
}
