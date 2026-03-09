import { Module } from '@nestjs/common';
import { PostHogService } from './posthog.service';

@Module({
  providers: [PostHogService],
})
export class PostHogModule {}
