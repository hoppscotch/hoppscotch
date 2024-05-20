import { Module } from '@nestjs/common';
import { TeamEnvironmentsService } from './team-environments.service';
import { TeamEnvironmentsResolver } from './team-environments.resolver';
import { UserModule } from 'src/user/user.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { TeamModule } from 'src/team/team.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GqlTeamEnvTeamGuard } from './gql-team-env-team.guard';
import { TeamEnvsTeamResolver } from './team.resolver';

@Module({
  imports: [PrismaModule, PubSubModule, UserModule, TeamModule],
  providers: [
    TeamEnvironmentsResolver,
    TeamEnvironmentsService,
    GqlTeamEnvTeamGuard,
    TeamEnvsTeamResolver,
  ],
  exports: [TeamEnvironmentsService, GqlTeamEnvTeamGuard],
})
export class TeamEnvironmentsModule {}
