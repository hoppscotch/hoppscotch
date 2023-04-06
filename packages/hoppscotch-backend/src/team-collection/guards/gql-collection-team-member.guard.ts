import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { TeamCollectionService } from '../team-collection.service';
import { TeamService } from '../../team/team.service';
import { TeamMemberRole } from '../../team/team.model';
import {
  BUG_TEAM_NO_REQUIRE_TEAM_ROLE,
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_COLL_NO_COLL_ID,
  TEAM_INVALID_COLL_ID,
  TEAM_REQ_NOT_MEMBER,
} from 'src/errors';
import * as E from 'fp-ts/Either';

@Injectable()
export class GqlCollectionTeamMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamService: TeamService,
    private readonly teamCollectionService: TeamCollectionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireRoles = this.reflector.get<TeamMemberRole[]>(
      'requiresTeamRole',
      context.getHandler(),
    );
    if (!requireRoles) throw new Error(BUG_TEAM_NO_REQUIRE_TEAM_ROLE);

    const gqlExecCtx = GqlExecutionContext.create(context);

    const { user } = gqlExecCtx.getContext().req;
    if (user == undefined) throw new Error(BUG_AUTH_NO_USER_CTX);

    const { collectionID } = gqlExecCtx.getArgs<{ collectionID: string }>();
    if (!collectionID) throw new Error(BUG_TEAM_COLL_NO_COLL_ID);

    const collection = await this.teamCollectionService.getCollection(
      collectionID,
    );
    if (E.isLeft(collection)) throw new Error(TEAM_INVALID_COLL_ID);

    const member = await this.teamService.getTeamMember(
      collection.right.teamID,
      user.uid,
    );
    if (!member) throw new Error(TEAM_REQ_NOT_MEMBER);

    return requireRoles.includes(member.role);
  }
}
