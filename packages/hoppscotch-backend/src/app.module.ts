import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UserModule } from './user/user.module';
import { GQLComplexityPlugin } from './plugins/GQLComplexityPlugin';
import { AuthModule } from './auth/auth.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserEnvironmentsModule } from './user-environment/user-environments.module';
import { UserHistoryModule } from './user-history/user-history.module';
import { subscriptionContextCookieParser } from './auth/helper';
import { TeamModule } from './team/team.module';
import { TeamEnvironmentsModule } from './team-environments/team-environments.module';
import { TeamCollectionModule } from './team-collection/team-collection.module';
import { TeamRequestModule } from './team-request/team-request.module';
import { TeamInvitationModule } from './team-invitation/team-invitation.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      cors: process.env.PRODUCTION !== 'true' && {
        origin: process.env.WHITELISTED_ORIGINS.split(','),
        credentials: true,
      },
      playground: process.env.PRODUCTION !== 'true',
      debug: process.env.PRODUCTION !== 'true',
      autoSchemaFile: true,
      installSubscriptionHandlers: true,
      subscriptions: {
        'subscriptions-transport-ws': {
          path: '/graphql',
          onConnect: (_, websocket) => {
            const cookies = subscriptionContextCookieParser(
              websocket.upgradeReq.headers.cookie,
            );
            return {
              headers: { ...websocket?.upgradeReq?.headers, cookies },
            };
          },
        },
      },
      context: ({ req, res, connection }) => ({
        req,
        res,
        connection,
      }),
      driver: ApolloDriver,
    }),
    UserModule,
    AuthModule,
    UserSettingsModule,
    UserEnvironmentsModule,
    UserHistoryModule,
    TeamModule,
    TeamEnvironmentsModule,
    TeamCollectionModule,
    TeamRequestModule,
    TeamInvitationModule,
  ],
  providers: [GQLComplexityPlugin],
})
export class AppModule {}
