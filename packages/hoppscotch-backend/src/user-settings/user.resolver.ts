import { ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from 'src/user/user.model';
import { UserSettings } from './user-settings.model';
import { UserSettingsService } from './user-settings.service';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';

@Resolver(() => User)
export class UserSettingsUserResolver {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @ResolveField(() => UserSettings, {
    description: 'Returns the authenticated users settings',
  })
  @UseGuards(GqlAuthGuard)
  async settings(@GqlUser() user: User) {
    const userSettings = await this.userSettingsService.fetchUserSettings(user);

    if (E.isLeft(userSettings)) throwErr(userSettings.left);
    return userSettings.right;
  }
}
