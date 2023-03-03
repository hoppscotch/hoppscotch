import { Module } from '@nestjs/common';
import { UserCollectionService } from './user-collection.service';
import { UserCollectionResolver } from './user-collection.resolver';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';

@Module({
  imports: [PrismaModule, UserModule, PubSubModule],
  providers: [UserCollectionService, UserCollectionResolver],
})
export class UserCollectionModule {}
