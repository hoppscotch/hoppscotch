import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserSettingsService } from './user-settings.service';
import { JSON_INVALID, USER_SETTINGS_NULL_SETTINGS } from 'src/errors';
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
  properties: JSON.stringify({ key: 'k', value: 'v' }),
  updatedOn: new Date('2022-12-19T12:43:18.635Z'),
};

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('UserSettingsService', () => {
  describe('createUserSettings', () => {
    test('Should resolve right and create an user setting with valid user and properties', async () => {
      mockPrisma.userSettings.create.mockResolvedValue({
        ...settings,
        properties: JSON.parse(settings.properties),
      });

      const result = await userSettingsService.createUserSettings(
        user,
        settings.properties,
      );

      expect(result).toEqualRight(settings);
    });
    test('Should reject user settings creation for invalid properties', async () => {
      const result = await userSettingsService.createUserSettings(
        user,
        'invalid-settings',
      );

      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('Should reject user settings creation for null properties', async () => {
      const result = await userSettingsService.createUserSettings(
        user,
        null as any,
      );

      expect(result).toEqualLeft(USER_SETTINGS_NULL_SETTINGS);
    });
  });
  describe('updateUserSettings', () => {
    test('Should update a user setting for valid user and settings', async () => {
      mockPrisma.userSettings.update.mockResolvedValue({
        ...settings,
        properties: JSON.parse(settings.properties),
      });

      const result = await userSettingsService.updateUserSettings(
        user,
        settings.properties,
      );

      expect(result).toEqualRight(settings);
    });
    test('Should reject user settings updation for invalid stringified JSON settings', async () => {
      const result = await userSettingsService.updateUserSettings(
        user,
        'invalid-settings',
      );

      expect(result).toEqualLeft(JSON_INVALID);
    });
    test('Should reject user settings updation for null properties', async () => {
      const result = await userSettingsService.updateUserSettings(
        user,
        null as any,
      );
      expect(result).toEqualLeft(USER_SETTINGS_NULL_SETTINGS);
    });
    test('should publish message over pubsub on successful update', async () => {
      mockPrisma.userSettings.update.mockResolvedValue({
        ...settings,
        properties: JSON.parse(settings.properties),
      });

      await userSettingsService.updateUserSettings(user, settings.properties);

      expect(mockPubSub.publish).toBeCalledWith(
        `user_settings/${user.uid}/updated`,
        settings,
      );
    });
  });
});
