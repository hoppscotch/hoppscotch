import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserCollectionModule } from 'src/user-collection/user-collection.module';
import { MockServerService } from './mock-server.service';
import { MockServerResolver } from './mock-server.resolver';
import { MockServerController } from './mock-server.controller';

@Module({
  imports: [PrismaModule, PubSubModule, UserCollectionModule],
  providers: [MockServerService, MockServerResolver],
  controllers: [MockServerController],
  exports: [MockServerService],
})
export class MockServerModule {}
