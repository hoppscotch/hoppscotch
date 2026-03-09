import { Module } from '@nestjs/common';
import { InfraTokenResolver } from './infra-token.resolver';
import { InfraTokenService } from './infra-token.service';
import { InfraTokensController } from './infra-token.controller';
import { AdminModule } from 'src/admin/admin.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [AdminModule, UserModule],
  controllers: [InfraTokensController],
  providers: [InfraTokenResolver, InfraTokenService],
})
export class InfraTokenModule {}
