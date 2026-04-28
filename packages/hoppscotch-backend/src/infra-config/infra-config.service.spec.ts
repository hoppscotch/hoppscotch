import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfigService } from './infra-config.service';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import {
  INFRA_CONFIG_INVALID_INPUT,
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

  describe('validateEnvValues', () => {
    describe('MAILER_SMTP_AUTH_TYPE', () => {
      it('should accept an empty value (defaults to login at runtime)', () => {
        const result = infraConfigService.validateEnvValues([
          { name: InfraConfigEnum.MAILER_SMTP_AUTH_TYPE, value: '' },
        ]);
        expect(result).toEqualRight(true);
      });

      it('should accept a known auth type', () => {
        const result = infraConfigService.validateEnvValues([
          { name: InfraConfigEnum.MAILER_SMTP_AUTH_TYPE, value: 'oauth2' },
        ]);
        expect(result).toEqualRight(true);
      });

      it('should reject an unknown auth type', () => {
        const result = infraConfigService.validateEnvValues([
          { name: InfraConfigEnum.MAILER_SMTP_AUTH_TYPE, value: 'kerberos' },
        ]);
        expect(result).toEqualLeft(INFRA_CONFIG_INVALID_INPUT);
      });
    });

    describe('MAILER_SMTP_OAUTH2_ACCESS_URL', () => {
      it('should accept an empty value', () => {
        const result = infraConfigService.validateEnvValues([
          { name: InfraConfigEnum.MAILER_SMTP_OAUTH2_ACCESS_URL, value: '' },
        ]);
        expect(result).toEqualRight(true);
      });

      it('should accept a valid HTTPS URL', () => {
        const result = infraConfigService.validateEnvValues([
          {
            name: InfraConfigEnum.MAILER_SMTP_OAUTH2_ACCESS_URL,
            value: 'https://oauth2.googleapis.com/token',
          },
        ]);
        expect(result).toEqualRight(true);
      });

      it('should reject a malformed URL', () => {
        const result = infraConfigService.validateEnvValues([
          {
            name: InfraConfigEnum.MAILER_SMTP_OAUTH2_ACCESS_URL,
            value: 'not-a-url',
          },
        ]);
        expect(result).toEqualLeft(INFRA_CONFIG_INVALID_INPUT);
      });
    });
  });

  describe('getOnboardingConfig', () => {
    const RECOVERY_TOKEN = 'valid-recovery-token-123';

    const mockConfigs = [
      {
        name: InfraConfigEnum.ONBOARDING_RECOVERY_TOKEN,
        value: RECOVERY_TOKEN,
      },
      { name: InfraConfigEnum.GOOGLE_CLIENT_ID, value: 'google-id' },
      {
        name: InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
        value: 'google',
      },
    ];

    it('should return config values when token is valid', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      const result =
        await infraConfigService.getOnboardingConfig(RECOVERY_TOKEN);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.ONBOARDING_RECOVERY_TOKEN]).toBe(
          RECOVERY_TOKEN,
        );
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBe(
          'google-id',
        );
      }
    });

    it('should return null values when token does not match', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      const result =
        await infraConfigService.getOnboardingConfig('wrong-token');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return null values when token is empty string', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      const result = await infraConfigService.getOnboardingConfig('');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return null values when token is whitespace only', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      const result = await infraConfigService.getOnboardingConfig('   ');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return null values when token is null', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      const result = await infraConfigService.getOnboardingConfig(null);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return null values when token is undefined', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      const result = await infraConfigService.getOnboardingConfig(undefined);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return null values when token is an array', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      // @ts-expect-error Testing invalid input
      const result = await infraConfigService.getOnboardingConfig([]);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return null values when token is a number', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(mockConfigs));

      // @ts-expect-error Testing invalid input
      const result = await infraConfigService.getOnboardingConfig(42);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return null values when ONBOARDING_RECOVERY_TOKEN is absent from configs', async () => {
      const configsWithoutToken = mockConfigs.filter(
        (c) => c.name !== InfraConfigEnum.ONBOARDING_RECOVERY_TOKEN,
      );
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.right(configsWithoutToken));

      const result =
        await infraConfigService.getOnboardingConfig(RECOVERY_TOKEN);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right[InfraConfigEnum.GOOGLE_CLIENT_ID]).toBeNull();
      }
    });

    it('should return left with error when getMany fails', async () => {
      jest
        .spyOn(infraConfigService, 'getMany')
        .mockResolvedValueOnce(E.left(INFRA_CONFIG_NOT_FOUND));

      const result =
        await infraConfigService.getOnboardingConfig(RECOVERY_TOKEN);

      expect(result).toEqualLeft(INFRA_CONFIG_NOT_FOUND);
    });
  });
});
