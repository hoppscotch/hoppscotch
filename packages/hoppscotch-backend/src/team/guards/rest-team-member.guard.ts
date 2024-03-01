import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamService } from '../../team/team.service';
import { TeamMemberRole } from '../../team/team.model';
import {
  BUG_TEAM_NO_REQUIRE_TEAM_ROLE,
  BUG_AUTH_NO_USER_CTX,
  BUG_TEAM_NO_TEAM_ID,
  TEAM_MEMBER_NOT_FOUND,
  TEAM_NOT_REQUIRED_ROLE,
} from 'src/errors';
import { throwHTTPErr } from 'src/utils';

@Injectable()
export class RESTTeamMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireRoles = this.reflector.get<TeamMemberRole[]>(
      'requiresTeamRole',
      context.getHandler(),
    );
    if (!requireRoles)
      throwHTTPErr({ message: BUG_TEAM_NO_REQUIRE_TEAM_ROLE, statusCode: 400 });

    const request = context.switchToHttp().getRequest();

    const { user } = request;
    if (user == undefined)
      throwHTTPErr({ message: BUG_AUTH_NO_USER_CTX, statusCode: 400 });

    const teamID = request.params.teamID;
    if (!teamID)
      throwHTTPErr({ message: BUG_TEAM_NO_TEAM_ID, statusCode: 400 });

    const teamMember = await this.teamService.getTeamMember(teamID, user.uid);
    if (!teamMember)
      throwHTTPErr({ message: TEAM_MEMBER_NOT_FOUND, statusCode: 404 });

    if (requireRoles.includes(teamMember.role)) return true;

    throwHTTPErr({ message: TEAM_NOT_REQUIRED_ROLE, statusCode: 403 });
  }
}
