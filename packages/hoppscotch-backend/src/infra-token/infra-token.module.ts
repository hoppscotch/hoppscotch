import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InfraTokenResolver } from './infra-token.resolver';
import { InfraTokenService } from './infra-token.service';
import { UserExternalApiController } from './user-external-api.controller';
import { AdminModule } from 'src/admin/admin.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [PrismaModule, AdminModule, UserModule],
  controllers: [UserExternalApiController],
  providers: [InfraTokenResolver, InfraTokenService],
})
export class InfraTokenModule {}
