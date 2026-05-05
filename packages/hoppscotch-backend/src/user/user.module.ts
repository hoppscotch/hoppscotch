import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { UserStatsController } from './user-stats.controller';
import { UserStatsService } from './user-stats.service';

@Module({
  providers: [UserResolver, UserService, UserStatsService],
  exports: [UserService],
  controllers: [UserStatsController]
})
export class UserModule {}
