import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { UserSettings } from './user-settings.model';
import { UserSettingsService } from './user-settings.service';
import { PubSubService } from 'src/pubsub/pubsub.service';

@Resolver()
export class UserSettingsResolver {
  constructor(
    private readonly userSettingsService: UserSettingsService,
    private readonly pubsub: PubSubService,
  ) {}

  /* Mutations */

  @Mutation(() => UserSettings, {
    description: 'Creates a new user setting',
  })
  @UseGuards(GqlAuthGuard)
  async createUserSettings(
    @GqlUser() user: User,
    @Args({
      name: 'properties',
      description: 'Stringified JSON settings object',
    })
    properties: string,
  ) {
    const createdUserSettings =
      await this.userSettingsService.createUserSettings(user, properties);

    if (E.isLeft(createdUserSettings)) throwErr(createdUserSettings.left);
    return createdUserSettings.right;
  }

  @Mutation(() => UserSettings, {
    description: 'Update user setting for a given user',
  })
  @UseGuards(GqlAuthGuard)
  async updateUserSettings(
    @GqlUser() user: User,
    @Args({
      name: 'properties',
      description: 'Stringified JSON settings object',
    })
    properties: string,
  ) {
    const updatedUserSettings =
      await this.userSettingsService.updateUserSettings(user, properties);

    if (E.isLeft(updatedUserSettings)) throwErr(updatedUserSettings.left);
    return updatedUserSettings.right;
  }

  /* Subscriptions */

  @Subscription(() => UserSettings, {
    description: 'Listen for user setting updates',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userSettingsUpdated(@GqlUser() user: User) {
    return this.pubsub.asyncIterator(`user_settings/${user.uid}/updated`);
  }
}
