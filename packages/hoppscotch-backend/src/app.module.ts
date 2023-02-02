import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UserModule } from './user/user.module';
import { GQLComplexityPlugin } from './plugins/GQLComplexityPlugin';
import { AuthModule } from './auth/auth.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserEnvironmentsModule } from './user-environment/user-environments.module';
import { UserHistoryModule } from './user-history/user-history.module';

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
          onConnect: (connectionParams: any) => {
            return {
              reqHeaders: Object.fromEntries(
                Object.entries(connectionParams).map(([k, v]) => [
                  k.toLowerCase(),
                  v,
                ]),
              ),
            };
          },
        },
      },
      context: async ({ req, connection }) => {
        if (req) {
          return { reqHeaders: req.headers };
        } else {
          return {
            // Lowercase the keys
            reqHeaders: Object.fromEntries(
              Object.entries(connection.context).map(([k, v]) => [
                k.toLowerCase(),
                v,
              ]),
            ),
          };
        }
      },
      driver: ApolloDriver,
    }),
    UserModule,
    AuthModule,
    UserSettingsModule,
    UserEnvironmentsModule,
    UserHistoryModule,
  ],
  providers: [GQLComplexityPlugin],
})
export class AppModule {}
