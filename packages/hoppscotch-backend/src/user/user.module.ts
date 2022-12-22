import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserService } from './user.service';

@Module({
  imports: [PubSubModule, PrismaModule],
  providers: [UserResolver, UserService],
  exports: [],
})
export class UserModule {}
