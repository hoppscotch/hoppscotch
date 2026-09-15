import { Module } from '@nestjs/common';
import { AIProviderModule } from 'src/ai-provider/ai-provider.module';
import { AIExperimentsController } from './ai-experiments.controller';
import { AIExperimentsService } from './ai-experiments.service';

@Module({
  imports: [AIProviderModule],
  controllers: [AIExperimentsController],
  providers: [AIExperimentsService],
})
export class AIExperimentsModule {}
