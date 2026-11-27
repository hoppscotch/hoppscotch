import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamResolver } from './team.resolver';
import { UserModule } from '../user/user.module';
import { TeamMemberResolver } from './team-member.resolver';
import { GqlTeamMemberGuard } from './guards/gql-team-member.guard';
import { GqlTeamResourceGuard } from './guards/gql-team-resource.guard';

@Module({
  imports: [UserModule],
  providers: [
    TeamService,
    TeamResolver,
    TeamMemberResolver,
    GqlTeamMemberGuard,
    GqlTeamResourceGuard,
  ],
  exports: [TeamService, GqlTeamMemberGuard, GqlTeamResourceGuard],
})
export class TeamModule {}
