import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamCollectionService } from './team-collection.service';
import { TeamCollectionResolver } from './team-collection.resolver';
import { GqlCollectionTeamMemberGuard } from './guards/gql-collection-team-member.guard';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';
import { PubSubModule } from '../pubsub/pubsub.module';
import { TeamCollectionController } from './team-collection.controller';

@Module({
  imports: [PrismaModule, TeamModule, UserModule, PubSubModule],
  providers: [
    TeamCollectionService,
    TeamCollectionResolver,
    GqlCollectionTeamMemberGuard,
  ],
  exports: [TeamCollectionService, GqlCollectionTeamMemberGuard],
  controllers: [TeamCollectionController],
})
export class TeamCollectionModule {}
