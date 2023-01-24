import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PubSubModule } from '../pubsub/pubsub.module';
import { UserModule } from '../user/user.module';
import { UserHistoryUserResolver } from './user.resolver';
import { UserHistoryResolver } from './user-history.resolver';
import { UserHistoryService } from './user-history.service';

@Module({
  imports: [PrismaModule, PubSubModule, UserModule],
  providers: [UserHistoryResolver, UserHistoryService, UserHistoryUserResolver],
  exports: [UserHistoryService],
})
export class UserHistoryModule {}
