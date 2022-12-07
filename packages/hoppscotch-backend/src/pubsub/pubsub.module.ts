import { Module } from '@nestjs/common';
import { PubSubService } from './pubsub.service';

@Module({
  providers: [PubSubService],
  exports: [PubSubService],
})
export class PubSubModule {}
