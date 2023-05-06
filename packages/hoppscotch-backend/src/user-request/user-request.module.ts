import { Module } from '@nestjs/common';
import { UserCollectionModule } from 'src/user-collection/user-collection.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PubSubModule } from '../pubsub/pubsub.module';
import { UserRequestUserCollectionResolver } from './resolvers/user-collection.resolver';
import { UserRequestResolver } from './resolvers/user-request.resolver';
import { UserRequestService } from './user-request.service';

@Module({
  imports: [PrismaModule, PubSubModule, UserCollectionModule],
  providers: [
    UserRequestResolver,
    UserRequestUserCollectionResolver,
    UserRequestService,
  ],
})
export class UserRequestModule {}
