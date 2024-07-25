import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InfraTokenResolver } from './infra-token.resolver';
import { InfraTokenService } from './infra-token.service';
import { UserExternalApiController } from './user-external-api.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UserExternalApiController],
  providers: [InfraTokenResolver, InfraTokenService],
})
export class InfraTokenModule {}
