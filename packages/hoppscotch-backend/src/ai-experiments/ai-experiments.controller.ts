import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import * as E from 'fp-ts/Either';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { throwHTTPErr } from 'src/utils';
import { AIExperimentsService } from './ai-experiments.service';
import { ChatInput } from './types/ai-experiments.input';
import { ChatResponse } from './types/ai-experiments.response.types';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'ai-experiments', version: '1' })
export class AIExperimentsController {
  constructor(private readonly aiExperimentsService: AIExperimentsService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() chatInput: ChatInput): Promise<ChatResponse> {
    const res = await this.aiExperimentsService.chat(
      chatInput.messages ?? [],
      chatInput.context ?? '',
      chatInput.model,
      chatInput.connectionID,
    );

    if (E.isLeft(res)) throwHTTPErr(res.left);

    return res.right;
  }
}
