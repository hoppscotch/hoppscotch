import { Module } from '@nestjs/common';
import { AIProviderResolver } from './ai-provider.resolver';
import { AIProviderService } from './ai-provider.service';
import { AISettingsService } from './ai-settings.service';
import { AISkillService } from './ai-skill.service';

@Module({
  providers: [
    AIProviderResolver,
    AIProviderService,
    AISettingsService,
    AISkillService,
  ],
  exports: [AIProviderService, AISettingsService, AISkillService],
})
export class AIProviderModule {}
