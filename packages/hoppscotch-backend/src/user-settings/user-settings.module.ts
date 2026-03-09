import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { UserSettingsResolver } from './user-settings.resolver';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsUserResolver } from './user.resolver';

@Module({
  imports: [UserModule],
  providers: [
    UserSettingsResolver,
    UserSettingsService,
    UserSettingsUserResolver,
  ],
})
export class UserSettingsModule {}
