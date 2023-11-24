import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfigService } from './infra-config.service';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import { INFRA_CONFIG_NOT_FOUND } from 'src/errors';

const mockPrisma = mockDeep<PrismaService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const infraConfigService = new InfraConfigService(mockPrisma);

beforeEach(() => {
  mockReset(mockPrisma);
});

describe('InfraConfigService', () => {
  describe('update', () => {
    it('should update the infra config', async () => {
      const name = InfraConfigEnum.EULAConfig;
      const value = 'true';

      mockPrisma.infraConfig.update.mockResolvedValueOnce({
        id: '',
        name,
        value,
        active: true,
        createdOn: new Date(),
        updatedOn: new Date(),
      });
      const result = await infraConfigService.update(name, value);
      expect(result).toEqualRight({ name, value });
    });

    it('should pass correct params to prisma update', async () => {
      const name = InfraConfigEnum.EULAConfig;
      const value = 'true';

      await infraConfigService.update(name, value);

      expect(mockPrisma.infraConfig.update).toHaveBeenCalledWith({
        where: { name },
        data: { value },
      });
      expect(mockPrisma.infraConfig.update).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the infra config does not exist', async () => {
      const name = InfraConfigEnum.EULAConfig;
      const value = 'true';

      mockPrisma.infraConfig.update.mockRejectedValueOnce('null');

      const result = await infraConfigService.update(name, value);
      expect(result).toEqualLeft(INFRA_CONFIG_NOT_FOUND);
    });
  });

  describe('get', () => {
    it('should get the infra config', async () => {
      const name = InfraConfigEnum.EULAConfig;
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
      const name = InfraConfigEnum.EULAConfig;

      await infraConfigService.get(name);

      expect(mockPrisma.infraConfig.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { name },
      });
      expect(mockPrisma.infraConfig.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the infra config does not exist', async () => {
      const name = InfraConfigEnum.EULAConfig;

      mockPrisma.infraConfig.findUniqueOrThrow.mockRejectedValueOnce('null');

      const result = await infraConfigService.get(name);
      expect(result).toEqualLeft(INFRA_CONFIG_NOT_FOUND);
    });
  });
});
