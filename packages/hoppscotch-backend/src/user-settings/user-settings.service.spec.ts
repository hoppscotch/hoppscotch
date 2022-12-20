import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserSettingsService } from './user-settings.service';
import '@relmify/jest-fp-ts';
import {
  JSON_INVALID,
  USER_NOT_FOUND,
  USER_SETTINGS_INVALID_PROPERTIES,
  USER_SETTINGS_UPDATE_FAILED,
} from 'src/errors';

const mockPrisma = mockDeep<PrismaService>();
const mockPubSub = mockDeep<PubSubService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const userSettingsService = new UserSettingsService(
  mockPrisma,
  mockPubSub as any,
);

const user = {
  uid: 'user-uid',
  displayName: 'user-display-name',
  email: 'user-email',
  photoURL: 'user-photo-url',
};
const userSettings = {
  id: '1',
  userUid: user.uid,
  properties: { key: 'k', value: 'v' },
  updatedOn: new Date('2022-12-19T12:43:18.635Z'),
};

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('UserSettingsService', () => {
  describe('createUserSettings', () => {
    test('should create a user settings with valid user and properties', async () => {
      mockPrisma.userSettings.create.mockResolvedValue(userSettings);

      const result = await userSettingsService.createUserSettings(
        user,
        JSON.stringify(userSettings.properties),
      );

      expect(result).toEqualRight({
        ...userSettings,
        properties: JSON.stringify(userSettings.properties),
      });
    });
    test('should reject for invalid user', async () => {
      const result = await userSettingsService.createUserSettings(
        null as any,
        JSON.stringify(userSettings.properties),
      );

      expect(result).toEqualLeft(USER_NOT_FOUND);
    });
    test('should reject for invalid properties', async () => {
      const result = await userSettingsService.createUserSettings(
        user,
        'invalid-properties',
      );
      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('should reject for null properties', async () => {
      const result = await userSettingsService.createUserSettings(
        user,
        null as any,
      );
      expect(result).toEqualLeft(USER_SETTINGS_INVALID_PROPERTIES);
    });
  });
  describe('updateUserSettings', () => {
    test('should update a user settings for valid user and properties', async () => {
      mockPrisma.userSettings.update.mockResolvedValue(userSettings);

      const result = await userSettingsService.updateUserSettings(
        user,
        JSON.stringify(userSettings.properties),
      );

      expect(result).toEqualRight({
        ...userSettings,
        properties: JSON.stringify(userSettings.properties),
      });
    });
    test('should reject for invalid user', async () => {
      const result = await userSettingsService.updateUserSettings(
        null as any,
        JSON.stringify(userSettings.properties),
      );
      expect(result).toEqualLeft(USER_SETTINGS_UPDATE_FAILED);
    });
    test('should reject for invalid properties', async () => {
      const result = await userSettingsService.updateUserSettings(
        user,
        'invalid-properties',
      );
      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('should reject for null properties', async () => {
      const result = await userSettingsService.updateUserSettings(
        user,
        null as any,
      );
      expect(result).toEqualLeft(USER_SETTINGS_INVALID_PROPERTIES);
    });
    test('should publish message on pubnub after update successfully', async () => {
      mockPrisma.userSettings.update.mockResolvedValue(userSettings);

      await userSettingsService.updateUserSettings(
        user,
        JSON.stringify(userSettings.properties),
      );

      expect(mockPubSub.publish).toBeCalledWith(
        `user_settings/${user.uid}/updated`,
        {
          ...userSettings,
          properties: JSON.stringify(userSettings.properties),
        },
      );
    });
  });
});
