import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import { stringToJson } from 'src/utils';
import { UserSettings } from './user-settings.model';
import {
  USER_SETTINGS_ALREADY_EXISTS,
  USER_SETTINGS_NULL_SETTINGS,
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
        userSettings: JSON.stringify(userSettings.settings),
      };
      delete (settings as any).settings;

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
  async createUserSettings(user: User, settingsString: string) {
    if (!settingsString) return E.left(USER_SETTINGS_NULL_SETTINGS);

    const settingsObject = stringToJson(settingsString);
    if (E.isLeft(settingsObject)) return E.left(settingsObject.left);

    try {
      const userSettings = await this.prisma.userSettings.create({
        data: {
          settings: settingsObject.right,
          userUid: user.uid,
        },
      });

      const settings: UserSettings = {
        ...userSettings,
        userSettings: JSON.stringify(userSettings.settings),
      };
      delete (settings as any).settings;

      return E.right(settings);
    } catch (e) {
      return E.left(USER_SETTINGS_ALREADY_EXISTS);
    }
  }

  /**
   * Update user setting for a given user
   * @param user User object
   * @param properties
   * @returns
   */
  async updateUserSettings(user: User, settingsString: string) {
    if (!settingsString) return E.left(USER_SETTINGS_NULL_SETTINGS);

    const settingsObject = stringToJson(settingsString);
    if (E.isLeft(settingsObject)) return E.left(settingsObject.left);

    try {
      const updatedUserSettings = await this.prisma.userSettings.update({
        where: { userUid: user.uid },
        data: {
          settings: settingsObject.right,
        },
      });

      const settings: UserSettings = {
        ...updatedUserSettings,
        userSettings: JSON.stringify(updatedUserSettings.settings),
      };
      delete (settings as any).settings;

      // Publish subscription for environment creation
      await this.pubsub.publish(`user_settings/${user.uid}/updated`, settings);

      return E.right(settings);
    } catch (e) {
      return E.left(USER_SETTINGS_NOT_FOUND);
    }
  }
}
