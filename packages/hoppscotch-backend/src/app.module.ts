import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UserModule } from './user/user.module';
import { GQLComplexityPlugin } from './plugins/GQLComplexityPlugin';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
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
  ],
  providers: [GQLComplexityPlugin],
})
export class AppModule {}
