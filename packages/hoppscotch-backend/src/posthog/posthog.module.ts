import { Module } from '@nestjs/common';
import { PosthogService } from './posthog.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PosthogService],
})
export class PosthogModule {}
