import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserService } from './user.service';

@Module({
  imports: [PubSubModule],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UserModule {}
