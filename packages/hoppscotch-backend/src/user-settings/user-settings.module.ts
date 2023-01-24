import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserModule } from 'src/user/user.module';
import { UserSettingsResolver } from './user-settings.resolver';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsUserResolver } from './user.resolver';

@Module({
  imports: [PrismaModule, PubSubModule, UserModule],
  providers: [
    UserSettingsResolver,
    UserSettingsService,
    UserSettingsUserResolver,
  ],
})
export class UserSettingsModule {}
