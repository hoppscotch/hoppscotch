import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserCollectionModule } from 'src/user-collection/user-collection.module';
import { MockServerService } from './mock-server.service';
import { MockServerResolver } from './mock-server.resolver';
import { MockServerMiddleware } from './mock-server.middleware';

@Module({
  imports: [PrismaModule, PubSubModule, UserCollectionModule],
  providers: [MockServerService, MockServerResolver, MockServerMiddleware],
  exports: [MockServerService],
})
export class MockServerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockServerMiddleware).forRoutes('*'); // Apply to all routes, middleware will filter for mock subdomains
  }
}
