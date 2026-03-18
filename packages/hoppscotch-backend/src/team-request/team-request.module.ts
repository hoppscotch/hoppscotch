import { Module } from '@nestjs/common';
import { TeamRequestService } from './team-request.service';
import { TeamRequestResolver } from './team-request.resolver';
import { TeamModule } from '../team/team.module';
import { TeamCollectionModule } from '../team-collection/team-collection.module';
import { GqlRequestTeamMemberGuard } from './guards/gql-request-team-member.guard';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TeamModule, TeamCollectionModule, UserModule],
  providers: [
    TeamRequestService,
    TeamRequestResolver,
    GqlRequestTeamMemberGuard,
  ],
  exports: [TeamRequestService, GqlRequestTeamMemberGuard],
})
export class TeamRequestModule {}
