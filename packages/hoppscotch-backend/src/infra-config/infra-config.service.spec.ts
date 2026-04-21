import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfigService } from './infra-config.service';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import {
  INFRA_CONFIG_NOT_FOUND,
  INFRA_CONFIG_OPERATION_NOT_ALLOWED,
  INFRA_CONFIG_UPDATE_FAILED,
} from 'src/errors';
import { ConfigService } from '@nestjs/config';
import * as helper from './helper';
import { InfraConfig as dbInfraConfig } from 'src/generated/prisma/client';
import { InfraConfig } from './infra-config.model';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { ServiceStatus } from './helper';
import * as E from 'fp-ts/Either';
import { UserService } from 'src/user/user.service';

const mockPrisma = mockDeep<PrismaService>();
const mockConfigService = mockDeep<ConfigService>();
const mockPubsub = mockDeep<PubSubService>();
const mockUserService = mockDeep<UserService>();

const infraConfigService = new InfraConfigService(
  mockPrisma,
  mockConfigService,
  mockPubsub,
  mockUserService,
);

const INITIALIZED_DATE_CONST = new Date();
const dbInfraConfigs: dbInfraConfig[] = [
  {
    id: '3',
    name: InfraConfigEnum.GOOGLE_CLIENT_ID,
    value: 'abcdefghijkl',
    lastSyncedEnvFileValue: 'abcdefghijkl',
    isEncrypted: false,
    createdOn: INITIALIZED_DATE_CONST,
    updatedOn: INITIALIZED_DATE_CONST,
  },
  {
    id: '4',
    name: InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
    value: 'google',
    lastSyncedEnvFileValue: 'google',
    isEncrypted: false,
    createdOn: INITIALIZED_DATE_CONST,
    updatedOn: INITIALIZED_DATE_CONST,
  },
];
const infraConfigs: InfraConfig[] = [
  {
    name: dbInfraConfigs[0].name as InfraConfigEnum,
    value: dbInfraConfigs[0].value,
  },
  {
    name: dbInfraConfigs[1].name as InfraConfigEnum,
    value: dbInfraConfigs[1].value,
  },
];

beforeEach(() => {
  mockReset(mockPrisma);
});

describe('InfraConfigService', () => {
  describe('update', () => {
    it('should update the infra config without backend server restart', async () => {
      const name = dbInfraConfigs[0].name;
      const value = 'newValue';

      mockPrisma.infraConfig.findUnique.mockResolvedValueOnce(
        dbInfraConfigs[0],
      );
      mockPrisma.infraConfig.update.mockResolvedValueOnce({
        ...dbInfraConfigs[0],
        name,
        value,
      });

      jest.spyOn(helper, 'stopApp').mockReturnValueOnce();
      const result = await infraConfigService.update(
        name as InfraConfigEnum,
        value,
      );

      expect(helper.stopApp).not.toHaveBeenCalled();
      expect(result).toEqualRight({ name, value });
    });

    it('should update the infra config with backend server restart', async () => {
      const name = dbInfraConfigs[0].name;
      const value = 'newValue';

      mockPrisma.infraConfig.findUnique.mockResolvedValueOnce(
        dbInfraConfigs[0],
      );
      mockPrisma.infraConfig.update.mockResolvedValueOnce({
        ...dbInfraConfigs[0],
        name,
        value,
      });
      jest.spyOn(helper, 'stopApp').mockReturnValueOnce();

      const result = await infraConfigService.update(
        name as InfraConfigEnum,
        value,
        true,
      );

      expect(helper.stopApp).toHaveBeenCalledTimes(1);
      expect(result).toEqualRight({ name, value });
    });

    it('should update the infra config', async () => {
      const name = dbInfraConfigs[0].name;
      const value = 'newValue';

      mockPrisma.infraConfig.findUnique.mockResolvedValueOnce(
        dbInfraConfigs[0],
      );
      mockPrisma.infraConfig.update.mockResolvedValueOnce({
        ...dbInfraConfigs[0],
        name,
        value,
      });
      jest.spyOn(helper, 'stopApp').mockReturnValueOnce();

      const result = await infraConfigService.update(
        name as InfraConfigEnum,
        value,
      );
      expect(result).toEqualRight({ name, value });
    });

    it('should pass correct params to prisma update', async () => {
      const name = dbInfraConfigs[0].name;
      const value = 'newValue';

      mockPrisma.infraConfig.findUnique.mockResolvedValueOnce(
        dbInfraConfigs[0],
      );

      jest.spyOn(helper, 'stopApp').mockReturnValueOnce();

      await infraConfigService.update(name as InfraConfigEnum, value);

      expect(mockPrisma.infraConfig.update).toHaveBeenCalledWith({
        where: { name },
        data: { value },
      });
      expect(mockPrisma.infraConfig.update).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the infra config update failed', async () => {
      const name = InfraConfigEnum.GOOGLE_CLIENT_ID;
      const value = 'true';

      mockPrisma.infraConfig.update.mockRejectedValueOnce('null');

      const result = await infraConfigService.update(name, value);
      expect(result).toEqualLeft(INFRA_CONFIG_UPDATE_FAILED);
    });
  });

  describe('get', () => {
    it('should get the infra config', async () => {
      const name = dbInfraConfigs[0].name;
      const value = dbInfraConfigs[0].value;

      mockPrisma.infraConfig.findUniqueOrThrow.mockResolvedValueOnce(
        dbInfraConfigs[0],
      );
      const result = await infraConfigService.get(name as InfraConfigEnum);
      expect(result).toEqualRight({ name, value });
    });

    it('should pass correct params to prisma findUnique', async () => {
      const name = InfraConfigEnum.GOOGLE_CLIENT_ID;

      await infraConfigService.get(name);

      expect(mockPrisma.infraConfig.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { name },
      });
      expect(mockPrisma.infraConfig.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the infra config does not exist', async () => {
      const name = InfraConfigEnum.GOOGLE_CLIENT_ID;

      mockPrisma.infraConfig.findUniqueOrThrow.mockRejectedValueOnce('null');

      const result = await infraConfigService.get(name);
      expect(result).toEqualLeft(INFRA_CONFIG_NOT_FOUND);
    });
  });

  describe('getMany', () => {
    it('should throw error if any disallowed names are provided', async () => {
      const disallowedNames = [InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS];
      const result = await infraConfigService.getMany(disallowedNames);

      expect(result).toEqualLeft(INFRA_CONFIG_OPERATION_NOT_ALLOWED);
    });
    it('should resolve right with disallowed names if `checkDisallowed` parameter passed', async () => {
      const disallowedNames = [InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS];

      const dbInfraConfigResponses = dbInfraConfigs.filter((dbConfig) =>
        disallowedNames.includes(dbConfig.name as InfraConfigEnum),
      );
      mockPrisma.infraConfig.findMany.mockResolvedValueOnce(
        dbInfraConfigResponses,
      );

      const result = await infraConfigService.getMany(disallowedNames, false);

      expect(result).toEqualRight(
        infraConfigs.filter((i) => disallowedNames.includes(i.name)),
      );
    });

    it('should return right with infraConfigs if Prisma query succeeds', async () => {
      const allowedNames = [InfraConfigEnum.GOOGLE_CLIENT_ID];

      const dbInfraConfigResponses = dbInfraConfigs.filter((dbConfig) =>
        allowedNames.includes(dbConfig.name as InfraConfigEnum),
      );
      mockPrisma.infraConfig.findMany.mockResolvedValueOnce(
        dbInfraConfigResponses,
      );

      const result = await infraConfigService.getMany(allowedNames);
      expect(result).toEqualRight(
        infraConfigs.filter((i) => allowedNames.includes(i.name)),
      );
    });
  });

  describe('toggleServiceStatus', () => {
    it('should toggle the service status', async () => {
      const configName = infraConfigs[0].name;
      const configStatus = ServiceStatus.DISABLE;

      jest
        .spyOn(infraConfigService, 'update')
        .mockResolvedValueOnce(
          E.right({ name: configName, value: configStatus }),
        );

      expect(
        await infraConfigService.toggleServiceStatus(configName, configStatus),
      ).toEqualRight(true);
    });
    it('should publish the updated config value', async () => {
      const configName = infraConfigs[0].name;
      const configStatus = ServiceStatus.DISABLE;

      jest
        .spyOn(infraConfigService, 'update')
        .mockResolvedValueOnce(
          E.right({ name: configName, value: configStatus }),
        );

      await infraConfigService.toggleServiceStatus(configName, configStatus);

      expect(mockPubsub.publish).toHaveBeenCalledTimes(1);
      expect(mockPubsub.publish).toHaveBeenCalledWith(
        'infra_config/GOOGLE_CLIENT_ID/updated',
        configStatus,
      );
    });
  });

  describe('validateEnvValues', () => {
    it.each([
      InfraConfigEnum.JWT_SECRET,
      InfraConfigEnum.SESSION_SECRET,
      InfraConfigEnum.ALLOW_SECURE_COOKIES,
    ])('should reject sensitive key %s with OPERATION_NOT_ALLOWED', (name) => {
      const result = infraConfigService.validateEnvValues([
        { name, value: 'any-value' },
      ]);
      expect(result).toEqualLeft(INFRA_CONFIG_OPERATION_NOT_ALLOWED);
    });

    it('should reject when a sensitive key is mixed with allowed keys', () => {
      const result = infraConfigService.validateEnvValues([
        {
          name: InfraConfigEnum.GOOGLE_CLIENT_ID,
          value: 'client-id',
        },
        {
          name: InfraConfigEnum.JWT_SECRET,
          value: 'attacker-controlled',
        },
      ]);
      expect(result).toEqualLeft(INFRA_CONFIG_OPERATION_NOT_ALLOWED);
    });

    it('should accept valid values for allowed keys', () => {
      const result = infraConfigService.validateEnvValues([
        { name: InfraConfigEnum.GOOGLE_CLIENT_ID, value: 'client-id' },
      ]);
      expect(result).toEqualRight(true);
    });
  });

  describe('update (sensitive keys)', () => {
    it.each([
      InfraConfigEnum.JWT_SECRET,
      InfraConfigEnum.SESSION_SECRET,
      InfraConfigEnum.ALLOW_SECURE_COOKIES,
    ])(
      'should refuse to update sensitive key %s and not hit the DB',
      async (name) => {
        const result = await infraConfigService.update(name, 'x');
        expect(result).toEqualLeft(INFRA_CONFIG_OPERATION_NOT_ALLOWED);
        expect(mockPrisma.infraConfig.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('updateMany (sensitive keys)', () => {
    it.each([
      InfraConfigEnum.JWT_SECRET,
      InfraConfigEnum.SESSION_SECRET,
      InfraConfigEnum.ALLOW_SECURE_COOKIES,
    ])(
      'should refuse to updateMany when %s is included (checkDisallowedKeys=false)',
      async (name) => {
        // checkDisallowedKeys=false bypasses the EXCLUDE_FROM_UPDATE_CONFIGS
        // guard; validateEnvValues must still reject the sensitive key.
        const result = await infraConfigService.updateMany(
          [{ name, value: 'x' }],
          false,
        );
        expect(result).toEqualLeft(INFRA_CONFIG_OPERATION_NOT_ALLOWED);
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      },
    );
  });

  describe('updateOnboardingConfig (allowlist filtering)', () => {
    it('should drop keys outside ONBOARDING_ALLOWED_KEYS before persisting', async () => {
      // Pretend the DTO has extra disallowed keys (mimicking a bypass of the
      // ValidationPipe, e.g. an internal caller). The service must still not
      // persist keys like JWT_SECRET / SESSION_SECRET / ALLOW_SECURE_COOKIES.
      const dto = {
        [InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS]: 'GOOGLE',
        [InfraConfigEnum.GOOGLE_CLIENT_ID]: 'gid',
        [InfraConfigEnum.GOOGLE_CLIENT_SECRET]: 'gsecret',
        [InfraConfigEnum.GOOGLE_CALLBACK_URL]: 'https://example.com/cb',
        [InfraConfigEnum.GOOGLE_SCOPE]: 'email',
        [InfraConfigEnum.JWT_SECRET]: 'ATTACKER',
        [InfraConfigEnum.SESSION_SECRET]: 'ATTACKER',
        [InfraConfigEnum.ALLOW_SECURE_COOKIES]: 'true',
      } as any;

      const updateManySpy = jest
        .spyOn(infraConfigService, 'updateMany')
        .mockResolvedValueOnce(E.right([] as any));

      await infraConfigService.updateOnboardingConfig(dto);

      expect(updateManySpy).toHaveBeenCalledTimes(1);
      const [persistedEntries] = updateManySpy.mock.calls[0];
      const persistedNames = persistedEntries.map((e) => e.name);

      // Disallowed / sensitive keys must be dropped
      expect(persistedNames).not.toContain(InfraConfigEnum.JWT_SECRET);
      expect(persistedNames).not.toContain(InfraConfigEnum.SESSION_SECRET);
      expect(persistedNames).not.toContain(
        InfraConfigEnum.ALLOW_SECURE_COOKIES,
      );
      // Allowed keys plus the onboarding bookkeeping keys should remain
      expect(persistedNames).toEqual(
        expect.arrayContaining([
          InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
          InfraConfigEnum.GOOGLE_CLIENT_ID,
          InfraConfigEnum.ONBOARDING_COMPLETED,
          InfraConfigEnum.ONBOARDING_RECOVERY_TOKEN,
        ]),
      );

      updateManySpy.mockRestore();
    });
  });

  describe('isUserHistoryEnabled', () => {
    it('should return true if the user history is enabled', async () => {
      const response = {
        name: InfraConfigEnum.USER_HISTORY_STORE_ENABLED,
        value: ServiceStatus.ENABLE,
      };

      jest.spyOn(infraConfigService, 'get').mockResolvedValueOnce(
        E.right({
          name: InfraConfigEnum.USER_HISTORY_STORE_ENABLED,
          value: ServiceStatus.ENABLE,
        }),
      );

      expect(await infraConfigService.isUserHistoryEnabled()).toEqualRight(
        response,
      );
    });
  });
});
