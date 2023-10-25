import { Module } from '@nestjs/common';
import { SharedRequestService } from './shared-request.service';
import { SharedRequestResolver } from './shared-request.resolver';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserModule } from 'src/user/user.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UserModule, PubSubModule],
  providers: [SharedRequestService, SharedRequestResolver],
})
export class SharedRequestModule {}
