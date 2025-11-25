import { Module } from '@nestjs/common';
import { TeamCollectionService } from './team-collection.service';
import { TeamCollectionResolver } from './team-collection.resolver';
import { GqlCollectionTeamMemberGuard } from './guards/gql-collection-team-member.guard';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';
import { TeamCollectionController } from './team-collection.controller';

@Module({
  imports: [TeamModule, UserModule],
  providers: [
    TeamCollectionService,
    TeamCollectionResolver,
    GqlCollectionTeamMemberGuard,
  ],
  exports: [TeamCollectionService, GqlCollectionTeamMemberGuard],
  controllers: [TeamCollectionController],
})
export class TeamCollectionModule {}
