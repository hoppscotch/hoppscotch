import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import { stringToJson } from 'src/utils';
import { UserSettings as DbUserSettings } from '@prisma/client';
import { UserSettings } from './user-settings.model';
import {
  USER_SETTINGS_ALREADY_EXISTS,
  USER_SETTINGS_NULL_SETTINGS,
  USER_SETTINGS_NOT_FOUND,
} from 'src/errors';
import { AuthUser } from 'src/types/AuthUser';

@Injectable()
export class UserSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  private castToUserSettings(userSettings: DbUserSettings): UserSettings {
    return {
      ...userSettings,
      properties: JSON.stringify(userSettings.properties),
    };
  }

  /**
   * Fetch user settings for a given user
   * @param user User object
   * @returns Promise of an Either of `UserSettings` or error
   */
  async fetchUserSettings(user: User) {
    try {
      const userSettings = await this.prisma.userSettings.findUniqueOrThrow({
        where: { userUid: user.uid },
      });

      const settings = this.castToUserSettings(userSettings);

      return E.right(settings);
    } catch (e) {
      return E.left(USER_SETTINGS_NOT_FOUND);
    }
  }

  /**
   * Create user setting for a given user
   * @param user User object
   * @param properties stringified user settings properties
   * @returns an Either of `UserSettings` or error
   */
  async createUserSettings(user: AuthUser, properties: string) {
    if (!properties) return E.left(USER_SETTINGS_NULL_SETTINGS);

    const jsonProperties = stringToJson(properties);
    if (E.isLeft(jsonProperties)) return E.left(jsonProperties.left);

    try {
      const userSettings = await this.prisma.userSettings.create({
        data: {
          properties: jsonProperties.right,
          userUid: user.uid,
        },
      });

      const settings = this.castToUserSettings(userSettings);

      // Publish subscription for user settings creation
      await this.pubsub.publish(`user_settings/${user.uid}/created`, settings);

      return E.right(settings);
    } catch (e) {
      return E.left(USER_SETTINGS_ALREADY_EXISTS);
    }
  }

  /**
   * Update user setting for a given user
   * @param user User object
   * @param properties stringified user settings
   * @returns Promise of an Either of `UserSettings` or error
   */
  async updateUserSettings(user: AuthUser, properties: string) {
    if (!properties) return E.left(USER_SETTINGS_NULL_SETTINGS);

    const jsonProperties = stringToJson(properties);
    if (E.isLeft(jsonProperties)) return E.left(jsonProperties.left);

    try {
      const updatedUserSettings = await this.prisma.userSettings.update({
        where: { userUid: user.uid },
        data: {
          properties: jsonProperties.right,
        },
      });

      const settings = this.castToUserSettings(updatedUserSettings);

      // Publish subscription for user settings update
      await this.pubsub.publish(`user_settings/${user.uid}/updated`, settings);

      return E.right(settings);
    } catch (e) {
      return E.left(USER_SETTINGS_NOT_FOUND);
    }
  }
}
