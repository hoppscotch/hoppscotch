import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserSettingsService } from './user-settings.service';
import {
  JSON_INVALID,
  USER_NOT_FOUND,
  USER_SETTINGS_NULL_SETTINGS,
  USER_SETTINGS_DATA_NOT_FOUND,
} from 'src/errors';
import { UserSettings } from './user-settings.model';
import { User } from 'src/user/user.model';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const userSettingsService = new UserSettingsService(
  mockPrisma,
  mockPubSub as any,
);

const user: User = {
  uid: 'aabb22ccdd',
  displayName: 'user-display-name',
  email: 'user-email',
  photoURL: 'user-photo-url',
};
const settings: UserSettings = {
  id: '1',
  userUid: user.uid,
  userSettings: JSON.stringify({ key: 'k', value: 'v' }),
  updatedOn: new Date('2022-12-19T12:43:18.635Z'),
};

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('UserSettingsService', () => {
  describe('createUserSettings', () => {
    test('should create a user setting with valid user and properties', async () => {
      mockPrisma.userSettings.create.mockResolvedValue({
        ...settings,
        settings: JSON.parse(settings.userSettings),
      });

      const result = await userSettingsService.createUserSettings(
        user,
        settings.userSettings,
      );

      expect(result).toEqualRight(settings);
    });
    test('should reject for invalid properties', async () => {
      const result = await userSettingsService.createUserSettings(
        user,
        'invalid-settings',
      );

      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('should reject for null settings', async () => {
      const result = await userSettingsService.createUserSettings(
        user,
        null as any,
      );

      expect(result).toEqualLeft(USER_SETTINGS_NULL_SETTINGS);
    });
  });
  describe('updateUserSettings', () => {
    test('should update a user setting for valid user and settings', async () => {
      mockPrisma.userSettings.update.mockResolvedValue({
        ...settings,
        settings: JSON.parse(settings.userSettings),
      });

      const result = await userSettingsService.updateUserSettings(
        user,
        settings.userSettings,
      );

      expect(result).toEqualRight(settings);
    });
    test('should reject for invalid stringified JSON settings', async () => {
      const result = await userSettingsService.updateUserSettings(
        user,
        'invalid-settings',
      );

      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('should reject for null settings', async () => {
      const result = await userSettingsService.updateUserSettings(
        user,
        null as any,
      );
      expect(result).toEqualLeft(USER_SETTINGS_NULL_SETTINGS);
    });
    test('should publish message over pubsub on successful update', async () => {
      mockPrisma.userSettings.update.mockResolvedValue({
        ...settings,
        settings: JSON.parse(settings.userSettings),
      });

      await userSettingsService.updateUserSettings(user, settings.userSettings);

      expect(mockPubSub.publish).toBeCalledWith(
        `user_settings/${user.uid}/updated`,
        settings,
      );
    });
  });
});
