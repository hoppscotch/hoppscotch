import { Test, TestingModule } from '@nestjs/testing';
import { UserStatsService } from './user-stats.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as E from 'fp-ts/Either';

const mockPrismaService = {
  userCollection: { count: jest.fn() },
  userEnvironment: { count: jest.fn() },
  userRequest: { count: jest.fn() },
};

describe('UserStatsService', () => {
  let service: UserStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStatsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserStatsService>(UserStatsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getUserStats', () => {
    it('should return stats for a valid user', async () => {
      mockPrismaService.collection.count.mockResolvedValue(5);
      mockPrismaService.userEnvironment.count.mockResolvedValue(3);
      mockPrismaService.userRequest.count.mockResolvedValue(12);

      const result = await service.getUserStats('user-uid-123');

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual({
          collectionsCount: 5,
          environmentsCount: 3,
          requestsCount: 12,
        });
      }
    });

    it('should return Left error when Prisma throws', async () => {
      mockPrismaService.collection.count.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getUserStats('user-uid-123');

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBe('USER_STATS_FETCH_FAILED');
      }
    });
  });
});
