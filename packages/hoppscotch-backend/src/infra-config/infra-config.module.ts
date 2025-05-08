import { Module } from '@nestjs/common';
import { InfraConfigService } from './infra-config.service';
import { SiteController } from './infra-config.controller';
import { InfraConfigResolver } from './infra-config.resolver';

@Module({
  imports: [],
  providers: [InfraConfigResolver, InfraConfigService],
  exports: [InfraConfigService],
  controllers: [SiteController],
})
export class InfraConfigModule {}
