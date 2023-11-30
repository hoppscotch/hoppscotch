import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfigService } from './infra-config.service';
import {
  InfraConfigEnum,
  InfraConfigEnumForClient,
} from 'src/types/InfraConfig';
import { INFRA_CONFIG_NOT_FOUND, INFRA_CONFIG_UPDATE_FAILED } from 'src/errors';
import { ConfigService } from '@nestjs/config';
import * as helper from './helper';

const mockPrisma = mockDeep<PrismaService>();
const mockConfigService = mockDeep<ConfigService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const infraConfigService = new InfraConfigService(
  mockPrisma,
  mockConfigService,
);

beforeEach(() => {
  mockReset(mockPrisma);
});

describe('InfraConfigService', () => {
  describe('update', () => {
    it('should update the infra config', async () => {
      const name = InfraConfigEnum.GOOGLE_CLIENT_ID;
      const value = 'true';

      mockPrisma.infraConfig.update.mockResolvedValueOnce({
        id: '',
        name,
        value,
        active: true,
        createdOn: new Date(),
        updatedOn: new Date(),
      });
      jest.spyOn(helper, 'stopApp').mockReturnValueOnce();

      const result = await infraConfigService.update(name, value);
      expect(result).toEqualRight({ name, value });
    });

    it('should pass correct params to prisma update', async () => {
      const name = InfraConfigEnum.GOOGLE_CLIENT_ID;
      const value = 'true';

      jest.spyOn(helper, 'stopApp').mockReturnValueOnce();

      await infraConfigService.update(name, value);

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
      const name = InfraConfigEnumForClient.GOOGLE_CLIENT_ID;
      const value = 'true';

      mockPrisma.infraConfig.findUniqueOrThrow.mockResolvedValueOnce({
        id: '',
        name,
        value,
        active: true,
        createdOn: new Date(),
        updatedOn: new Date(),
      });
      const result = await infraConfigService.get(name);
      expect(result).toEqualRight({ name, value });
    });

    it('should pass correct params to prisma findUnique', async () => {
      const name = InfraConfigEnumForClient.GOOGLE_CLIENT_ID;

      await infraConfigService.get(name);

      expect(mockPrisma.infraConfig.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { name },
      });
      expect(mockPrisma.infraConfig.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the infra config does not exist', async () => {
      const name = InfraConfigEnumForClient.GOOGLE_CLIENT_ID;

      mockPrisma.infraConfig.findUniqueOrThrow.mockRejectedValueOnce('null');

      const result = await infraConfigService.get(name);
      expect(result).toEqualLeft(INFRA_CONFIG_NOT_FOUND);
    });
  });
});
