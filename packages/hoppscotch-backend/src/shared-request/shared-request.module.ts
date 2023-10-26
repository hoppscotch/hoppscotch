import { Module } from '@nestjs/common';
import { SharedRequestService } from './shared-request.service';
import { SharedRequestResolver } from './shared-request.resolver';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, PubSubModule],
  providers: [SharedRequestService, SharedRequestResolver],
})
export class SharedRequestModule {}
