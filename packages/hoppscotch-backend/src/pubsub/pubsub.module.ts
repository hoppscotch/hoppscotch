import { Global, Module } from '@nestjs/common';
import { PubSubService } from './pubsub.service';

@Global()
@Module({
  providers: [PubSubService],
  exports: [PubSubService],
})
export class PubSubModule {}
