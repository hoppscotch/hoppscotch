import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamCollectionService } from './team-collection.service';
import { TeamCollectionResolver } from './team-collection.resolver';
import { GqlCollectionTeamMemberGuard } from './guards/gql-collection-team-member.guard';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';
// import { FirebaseModule } from '../firebase/firebase.module';
import { PubSubModule } from '../pubsub/pubsub.module';

@Module({
  imports: [
    PrismaModule,
    // FirebaseModule,
    TeamModule,
    UserModule,
    PubSubModule,
  ],
  providers: [
    TeamCollectionService,
    TeamCollectionResolver,
    GqlCollectionTeamMemberGuard,
  ],
  exports: [TeamCollectionService, GqlCollectionTeamMemberGuard],
})
export class TeamCollectionModule {}
