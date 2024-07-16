import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InfraTokenResolver } from './infra-token.resolver';
import { InfraTokenService } from './infra-token.service';

@Module({
  imports: [PrismaModule],
  providers: [InfraTokenResolver, InfraTokenService],
})
export class InfraTokenModule {}
