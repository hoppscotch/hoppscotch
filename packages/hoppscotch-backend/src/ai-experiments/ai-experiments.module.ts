import { Module } from '@nestjs/common';
import { AIExperimentsController } from './ai-experiments.controller';
import { AIExperimentsService } from './ai-experiments.service';

@Module({
  controllers: [AIExperimentsController],
  providers: [AIExperimentsService],
})
export class AIExperimentsModule {}
