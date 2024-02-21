import { Module } from '@nestjs/common';
import { InfraConfigService } from './infra-config.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SiteController } from './infra-config.controller';

@Module({
  imports: [PrismaModule],
  providers: [InfraConfigService],
  exports: [InfraConfigService],
  controllers: [SiteController],
})
export class InfraConfigModule {}
