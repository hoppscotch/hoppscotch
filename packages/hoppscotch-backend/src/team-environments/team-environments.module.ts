import { Module } from '@nestjs/common';
import { TeamEnvironmentsService } from './team-environments.service';
import { TeamEnvironmentsResolver } from './team-environments.resolver';
import { UserModule } from 'src/user/user.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { TeamModule } from 'src/team/team.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GqlTeamEnvTeamGuard } from './gql-team-env-team.guard';
import { TeamEnvsTeamResolver } from './team.resolver';
import { TeamEnvironmentsController } from './team-environments.controller';
import { AccessTokenModule } from 'src/access-token/access-token.module';

@Module({
  imports: [
    PrismaModule,
    PubSubModule,
    UserModule,
    TeamModule,
    AccessTokenModule,
  ],
  providers: [
    TeamEnvironmentsResolver,
    TeamEnvironmentsService,
    GqlTeamEnvTeamGuard,
    TeamEnvsTeamResolver,
  ],
  exports: [TeamEnvironmentsService, GqlTeamEnvTeamGuard],
  controllers: [TeamEnvironmentsController],
})
export class TeamEnvironmentsModule {}
