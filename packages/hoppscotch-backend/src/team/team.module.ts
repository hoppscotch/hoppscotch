import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamResolver } from './team.resolver';
import { UserModule } from '../user/user.module';
import { TeamMemberResolver } from './team-member.resolver';
import { GqlTeamMemberGuard } from './guards/gql-team-member.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { PubSubModule } from '../pubsub/pubsub.module';

@Module({
  imports: [UserModule ,PubSubModule , PrismaModule ],
  providers: [
    TeamService,
    TeamResolver,
    TeamMemberResolver,
    GqlTeamMemberGuard,
  ],
  exports: [TeamService, GqlTeamMemberGuard],
})
export class TeamModule {}
