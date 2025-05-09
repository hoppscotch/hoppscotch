import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { UserHistoryUserResolver } from './user.resolver';
import { UserHistoryResolver } from './user-history.resolver';
import { UserHistoryService } from './user-history.service';
import { InfraConfigModule } from 'src/infra-config/infra-config.module';

@Module({
  imports: [UserModule, InfraConfigModule],
  providers: [UserHistoryResolver, UserHistoryService, UserHistoryUserResolver],
  exports: [UserHistoryService],
})
export class UserHistoryModule {}
