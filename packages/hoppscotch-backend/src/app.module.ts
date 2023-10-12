import { ForbiddenException, HttpException, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UserModule } from './user/user.module';
import { GQLComplexityPlugin } from './plugins/GQLComplexityPlugin';
import { AuthModule } from './auth/auth.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserEnvironmentsModule } from './user-environment/user-environments.module';
import { UserRequestModule } from './user-request/user-request.module';
import { UserHistoryModule } from './user-history/user-history.module';
import { subscriptionContextCookieParser } from './auth/helper';
import { TeamModule } from './team/team.module';
import { TeamEnvironmentsModule } from './team-environments/team-environments.module';
import { TeamCollectionModule } from './team-collection/team-collection.module';
import { TeamRequestModule } from './team-request/team-request.module';
import { TeamInvitationModule } from './team-invitation/team-invitation.module';
import { AdminModule } from './admin/admin.module';
import { UserCollectionModule } from './user-collection/user-collection.module';
import { ShortcodeModule } from './shortcode/shortcode.module';
import { COOKIES_NOT_FOUND } from './errors';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      buildSchemaOptions: {
        numberScalarMode: 'integer',
      },
      cors: {
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
            try {
              const cookies = subscriptionContextCookieParser(
                websocket.upgradeReq.headers.cookie,
              );

              return {
                headers: { ...websocket?.upgradeReq?.headers, cookies },
              };
            } catch (error) {
              throw new HttpException(COOKIES_NOT_FOUND, 400, {
                cause: new Error(COOKIES_NOT_FOUND),
              });
            }
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
    ThrottlerModule.forRoot({
      ttl: +process.env.RATE_LIMIT_TTL,
      limit: +process.env.RATE_LIMIT_MAX,
    }),
    UserModule,
    AuthModule,
    AdminModule,
    UserSettingsModule,
    UserEnvironmentsModule,
    UserHistoryModule,
    UserRequestModule,
    TeamModule,
    TeamEnvironmentsModule,
    TeamCollectionModule,
    TeamRequestModule,
    TeamInvitationModule,
    UserCollectionModule,
    ShortcodeModule,
  ],
  providers: [GQLComplexityPlugin],
  controllers: [AppController],
})
export class AppModule {}
