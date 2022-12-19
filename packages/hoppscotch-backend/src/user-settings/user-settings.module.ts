import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserSettingsResolver } from './user-settings.resolver';
import { UserSettingsService } from './user-settings.service';

@Module({
  imports: [PrismaModule, PubSubModule],
  providers: [UserSettingsResolver, UserSettingsService],
})
export class UserSettingsModule {}
