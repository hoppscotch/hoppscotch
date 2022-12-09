import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { PubSubModule } from 'src/pubsub/pubsub.module';

@Module({
  imports: [PubSubModule],
  providers: [UserResolver],
  exports: [],
})
export class UserModule {}
