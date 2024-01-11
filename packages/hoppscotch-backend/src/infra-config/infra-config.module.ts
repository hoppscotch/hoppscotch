import { Module } from '@nestjs/common';
import { InfraConfigService } from './infra-config.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InfraConfigService],
  exports: [InfraConfigService],
})
export class InfraConfigModule {}
