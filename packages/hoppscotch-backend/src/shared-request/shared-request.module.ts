import { Module } from '@nestjs/common';
import { SharedRequestService } from './shared-request.service';
import { SharedRequestResolver } from './shared-request.resolver';

@Module({
  providers: [SharedRequestService, SharedRequestResolver]
})
export class SharedRequestModule {}
