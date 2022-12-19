import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { UserSettings } from './user-settings.model';
import { UserSettingsService } from './user-settings.service';

@Resolver()
export class UserSettingsResolver {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  /* Mutations */

  @Mutation(() => UserSettings, {
    description: 'Creates a new user settings for given user',
  })
  @UseGuards(GqlAuthGuard)
  async createUserSettings(
    @GqlUser() user: User,
    @Args({
      name: 'properties',
      description: 'JSON string of properties object',
    })
    properties: string,
  ) {
    const userSettings = await this.userSettingsService.createUserSettings(
      user,
      properties,
    );

    if (E.isLeft(userSettings)) throwErr(userSettings.left);
    return userSettings.right;
  }

  @Mutation(() => UserSettings, {
    description: 'Update user settings for given user',
  })
  @UseGuards(GqlAuthGuard)
  async updateUserSettings(
    @GqlUser() user: User,
    @Args({
      name: 'properties',
      description: 'JSON string of properties object',
    })
    properties: string,
  ) {
    const updatedUserSettings =
      await this.userSettingsService.updateUserSettings(user, properties);

    if (E.isLeft(updatedUserSettings)) throwErr(updatedUserSettings.left);
    return updatedUserSettings.right;
  }

  /* Subscriptions */
}
