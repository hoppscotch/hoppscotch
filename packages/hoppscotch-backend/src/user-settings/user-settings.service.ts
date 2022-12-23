import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import { stringToJson } from 'src/utils';
import { UserSettings } from './user-settings.model';
import {
  USER_NOT_FOUND,
  USER_SETTINGS_INVALID_PROPERTIES,
  USER_SETTINGS_NOT_FOUND,
} from 'src/errors';

@Injectable()
export class UserSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  /**
   * Fetch user setting for a given user
   * @param user User object
   * @returns an Either of `UserSettings` or error
   */
  async fetchUserSettings(user: User) {
    try {
      const userSettings = await this.prisma.userSettings.findUniqueOrThrow({
        where: { userUid: user.uid },
      });

      const settings: UserSettings = {
        ...userSettings,
        properties: JSON.stringify(userSettings.properties),
      };

      return E.right(settings);
    } catch (e) {
      return E.left(USER_SETTINGS_NOT_FOUND);
    }
  }

  /**
   * Create user setting for a given user
   * @param user User object
   * @param properties User setting properties
   * @returns an Either of `UserSettings` or error
   */
  async createUserSettings(user: User, properties: string) {
    if (!properties) return E.left(USER_SETTINGS_INVALID_PROPERTIES);

    const settingsObject = stringToJson(properties);
    if (E.isLeft(settingsObject)) return E.left(settingsObject.left);

    try {
      const userSettings = await this.prisma.userSettings.create({
        data: {
          properties: settingsObject.right,
          userUid: user.uid,
        },
      });

      const settings: UserSettings = {
        ...userSettings,
        properties: JSON.stringify(userSettings.properties),
      };

      return E.right(settings);
    } catch (e) {
      return E.left(USER_NOT_FOUND);
    }
  }

  /**
   * Update user setting for a given user
   * @param user User object
   * @param properties
   * @returns
   */
  async updateUserSettings(user: User, properties: string) {
    if (!properties) return E.left(USER_SETTINGS_INVALID_PROPERTIES);

    const settingsObject = stringToJson(properties);
    if (E.isLeft(settingsObject)) return E.left(settingsObject.left);

    try {
      const updatedUserSettings = await this.prisma.userSettings.update({
        where: { userUid: user.uid },
        data: {
          properties: settingsObject.right,
        },
      });

      const settings: UserSettings = {
        ...updatedUserSettings,
        properties: JSON.stringify(updatedUserSettings.properties),
      };

      // Publish subscription for environment creation
      await this.pubsub.publish(`user_settings/${user.uid}/updated`, settings);

      return E.right(settings);
    } catch (e) {
      return E.left(USER_SETTINGS_NOT_FOUND);
    }
  }
}
