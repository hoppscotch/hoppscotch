import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { AuthUser } from 'src/types/AuthUser';
import { UserStatsService } from './user-stats.service';
import { throwHTTPErr } from 'src/utils';
import * as E from 'fp-ts/Either';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'user', version: '1' })
export class UserStatsController {
  constructor(private readonly userStatsService: UserStatsService) {}

  @Get('me/stats')
  async getUserStats(@GqlUser() user: AuthUser) {
    const result = await this.userStatsService.getUserStats(user.uid);

    if (E.isLeft(result)) {
      throwHTTPErr({ message: result.left, statusCode: 500 });
    }

    return result.right;
  }
}
