import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as E from 'fp-ts/Either';

export type UserStats = {
  collectionsCount: number;
  environmentsCount: number;
  requestsCount: number;
};

@Injectable()
export class UserStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserStats(userUID: string): Promise<E.Either<string, UserStats>> {
    try {
        const [collectionsCount, environmentsCount, requestsCount] =
        await Promise.all([
          this.prisma.userCollection.count({
            where: { userUid: userUID },
          }),
          this.prisma.userEnvironment.count({
            where: { userUid: userUID },
          }),
          this.prisma.userRequest.count({
            where: { userUid: userUID },
          }),
        ]);

      return E.right({
        collectionsCount,
        environmentsCount,
        requestsCount,
      });
    } catch (e) {
      return E.left('USER_STATS_FETCH_FAILED');
    }
  }
}
