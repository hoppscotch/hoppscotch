import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PubSubModule } from '../pubsub/pubsub.module';
import { UserModule } from '../user/user.module';
import { UserEnvsUserResolver } from './user.resolver';
import { UserEnvironmentsResolver } from './user-environments.resolver';
import { UserEnvironmentsService } from './user-environments.service';
import { SubscriptionHandler } from '../subscription-handler';

@Module({
  imports: [PrismaModule, PubSubModule, UserModule],
  providers: [
    UserEnvironmentsResolver,
    UserEnvironmentsService,
    UserEnvsUserResolver,
    SubscriptionHandler,
  ],
  exports: [UserEnvironmentsService],
})
export class UserEnvironmentsModule {}
