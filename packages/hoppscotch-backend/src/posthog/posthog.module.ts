import { Module } from '@nestjs/common';
import { PostHogService } from './posthog.service';

@Module({
  imports: [],
  providers: [PostHogService],
})
export class PostHogModule {}
