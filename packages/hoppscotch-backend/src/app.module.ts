import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaDriver, YogaDriverConfig } from '@graphql-yoga/nestjs';
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';
import type { IncomingHttpHeaders, IncomingMessage } from 'http';
import { UserModule } from './user/user.module';
import { useComplexityLimit } from './plugins/GQLComplexityPlugin';
import { useCsrfPrevention } from './plugins/csrf-prevention';
import { maskNestError } from './plugins/nest-error-mask';
import { AuthModule } from './auth/auth.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserEnvironmentsModule } from './user-environment/user-environments.module';
import { UserRequestModule } from './user-request/user-request.module';
import { UserHistoryModule } from './user-history/user-history.module';
import {
  subscriptionContextCookieParser,
  extractAccessTokenFromAuthRecords,
} from './auth/helper';
import { TeamModule } from './team/team.module';
import { TeamEnvironmentsModule } from './team-environments/team-environments.module';
import { TeamCollectionModule } from './team-collection/team-collection.module';
import { TeamRequestModule } from './team-request/team-request.module';
import { TeamInvitationModule } from './team-invitation/team-invitation.module';
import { AdminModule } from './admin/admin.module';
import { UserCollectionModule } from './user-collection/user-collection.module';
import { ShortcodeModule } from './shortcode/shortcode.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InfraConfigModule } from './infra-config/infra-config.module';
import { loadInfraConfiguration } from './infra-config/helper';
import { MailerModule } from './mailer/mailer.module';
import { PostHogModule } from './posthog/posthog.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { AccessTokenModule } from './access-token/access-token.module';
import { UserLastActiveOnInterceptor } from './interceptors/user-last-active-on.interceptor';
import { InfraTokenModule } from './infra-token/infra-token.module';
import { PrismaModule } from './prisma/prisma.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { SortModule } from './orchestration/sort/sort.module';
import { MockServerModule } from './mock-server/mock-server.module';
import { PublishedDocsModule } from './published-docs/published-docs.module';

/** graphql-ws `ctx.extra` for sockets served by `ws`, plus our auth headers. */
type SubscriptionSocketExtra = {
  request: IncomingMessage;
  headers?: Record<string, unknown>;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [async () => loadInfraConfiguration()],
    }),
    GraphQLModule.forRootAsync<YogaDriverConfig>({
      driver: YogaDriver,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('PRODUCTION') === 'true';

        return {
          buildSchemaOptions: {
            numberScalarMode: 'integer',
          },
          autoSchemaFile: true,
          graphiql: !isProduction,
          maskedErrors: { maskError: maskNestError },
          plugins: [
            useCsrfPrevention(!isProduction),
            useComplexityLimit(),
            ...(isProduction ? [useDisableIntrospection()] : []),
          ],
          subscriptions: {
            'graphql-ws': {
              path: '/graphql',
              // Resolve the auth headers once per socket; the guards read them
              // from the `headers` context field (see GqlAuthGuard).
              onConnect: (ctx) => {
                const extra = ctx.extra as SubscriptionSocketExtra;
                const websocketHeaders = extra.request.headers;

                try {
                  const accessToken = extractAccessTokenFromAuthRecords(
                    (ctx.connectionParams ?? {}) as IncomingHttpHeaders,
                  );
                  extra.headers = {
                    ...websocketHeaders,
                    authorization: `Bearer ${accessToken}`,
                  };
                  return true;
                } catch {
                  const cookiesFromHeader = websocketHeaders?.cookie;
                  if (!cookiesFromHeader) return false;

                  try {
                    extra.headers = {
                      ...websocketHeaders,
                      cookies: subscriptionContextCookieParser(cookiesFromHeader),
                    };
                    return true;
                  } catch {
                    return false;
                  }
                }
              },
            },
          },
          context: ({ req, res, extra }) =>
            extra
              ? {
                  req: (extra as SubscriptionSocketExtra).request,
                  headers: (extra as SubscriptionSocketExtra).headers,
                }
              : { req, res },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => [
        {
          ttl: +configService.get('INFRA.RATE_LIMIT_TTL'),
          limit: +configService.get('INFRA.RATE_LIMIT_MAX'),
        },
      ],
    }),
    PrismaModule,
    PubSubModule,
    MailerModule.register(),
    UserModule,
    AuthModule.register(),
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
    InfraConfigModule,
    PostHogModule,
    ScheduleModule.forRoot(),
    HealthModule,
    AccessTokenModule,
    InfraTokenModule,
    SortModule,
    MockServerModule,
    PublishedDocsModule,
  ],
  providers: [
    { provide: 'APP_INTERCEPTOR', useClass: UserLastActiveOnInterceptor },
  ],
  controllers: [AppController],
})
export class AppModule {}
