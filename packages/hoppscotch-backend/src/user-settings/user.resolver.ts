import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from 'src/user/user.model';
import { UserSettings } from './user-settings.model';
import { UserSettingsService } from './user-settings.service';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';

@Resolver(() => User)
export class UserSettingsUserResolver {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @ResolveField(() => UserSettings, {
    description: 'Returns user settings',
  })
  async settings(@Parent() user: User) {
    const userSettings = await this.userSettingsService.fetchUserSettings(user);

    if (E.isLeft(userSettings)) throwErr(userSettings.left);
    return userSettings.right;
  }
}
