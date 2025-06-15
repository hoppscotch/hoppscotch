import { Module } from '@nestjs/common';
import { InfraConfigService } from './infra-config.service';
import { SiteController } from './infra-config.controller';
import { InfraConfigResolver } from './infra-config.resolver';
import { UserModule } from 'src/user/user.module';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [UserModule],
  controllers: [SiteController, OnboardingController],
  providers: [InfraConfigResolver, InfraConfigService],
  exports: [InfraConfigService],
})
export class InfraConfigModule {}
