import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import * as E from 'fp-ts/Either';
import { GqlAdminGuard } from 'src/admin/guards/gql-admin.guard';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { throwErr } from 'src/utils';
import { describePresets } from 'src/ai-experiments/ai-experiments.providers';
import {
  AIChatModelOption,
  AIProviderConnection,
  AIProviderPreset,
  AIProviderTestResult,
  AISettings,
  AISkill,
} from './ai-provider.model';
import { AIProviderService } from './ai-provider.service';
import { AISettingsService } from './ai-settings.service';
import { AISkillService } from './ai-skill.service';
import {
  CreateAIProviderConnectionInput,
  TestAIProviderConnectionInput,
  CreateAISkillInput,
  UpdateAIProviderConnectionInput,
  UpdateAISettingsInput,
  UpdateAISkillInput,
} from './request-response.dto';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => AIProviderConnection)
export class AIProviderResolver {
  constructor(
    private readonly aiProviderService: AIProviderService,
    private readonly aiSettingsService: AISettingsService,
    private readonly aiSkillService: AISkillService,
  ) {}

  /* Queries */

  @Query(() => [AIProviderConnection], {
    description: 'Get the AI provider connections registered on this instance',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  aiProviderConnections() {
    return this.aiProviderService.getAll();
  }

  @Query(() => [AIProviderPreset], {
    description: 'Provider presets this build supports',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  aiProviderPresets(): AIProviderPreset[] {
    return describePresets().map((preset) => ({
      ...preset,
      baseURLHint: preset.baseURLHint ?? null,
      defaultBaseURL: preset.defaultBaseURL ?? null,
    }));
  }

  @Query(() => AISettings, {
    description: 'Instance-wide assistant settings',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  aiSettings() {
    return this.aiSettingsService.get();
  }

  @Query(() => [AISkill], {
    description: 'Every skill, for managing them',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  aiSkills() {
    return this.aiSkillService.getAll();
  }

  /* Chat queries. Any signed-in user: none of these exposes an endpoint
     or a credential, and the chat needs them to offer itself at all. */

  @Query(() => Boolean, {
    description: 'Whether the AI assistant is enabled on this instance',
  })
  @UseGuards(GqlAuthGuard)
  aiChatEnabled() {
    return this.aiSettingsService.isEnabled();
  }

  @Query(() => [AIChatModelOption], {
    description: 'Models the signed-in user may choose between in the chat',
  })
  @UseGuards(GqlAuthGuard)
  aiChatModelOptions() {
    return this.aiProviderService.listModelOptions();
  }

  @Query(() => [AISkill], {
    description: 'Skills the assistant offers in the composer',
  })
  @UseGuards(GqlAuthGuard)
  aiChatSkills() {
    return this.aiSkillService.listForChat();
  }

  /* Mutations */

  @Mutation(() => AIProviderConnection, {
    description: 'Register an AI provider connection',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async createAIProviderConnection(
    @Args({ name: 'input' }) input: CreateAIProviderConnectionInput,
  ) {
    const res = await this.aiProviderService.create(input);
    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => AIProviderConnection, {
    description: 'Change an AI provider connection. Omit apiKey to keep it',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async updateAIProviderConnection(
    @Args({ name: 'input' }) input: UpdateAIProviderConnectionInput,
  ) {
    const res = await this.aiProviderService.update(input);
    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => AISettings, {
    description: 'Change the instance-wide assistant settings',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  updateAISettings(@Args({ name: 'input' }) input: UpdateAISettingsInput) {
    return this.aiSettingsService.update(input);
  }

  @Mutation(() => AISkill, { description: 'Add a skill' })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async createAISkill(@Args({ name: 'input' }) input: CreateAISkillInput) {
    const res = await this.aiSkillService.create(input);
    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => AISkill, { description: 'Change a skill' })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async updateAISkill(@Args({ name: 'input' }) input: UpdateAISkillInput) {
    const res = await this.aiSkillService.update(input);
    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => Boolean, { description: 'Remove a skill' })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async deleteAISkill(@Args({ name: 'id', type: () => ID }) id: string) {
    const res = await this.aiSkillService.delete(id);
    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => [AIProviderTestResult], {
    description: 'Send a live probe to each model and report what came back',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async testAIProviderConnection(
    @Args({ name: 'input' }) input: TestAIProviderConnectionInput,
  ) {
    const res = await this.aiProviderService.testConnection(input);
    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }

  @Mutation(() => Boolean, {
    description: 'Remove an AI provider connection',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async deleteAIProviderConnection(
    @Args({ name: 'id', type: () => ID }) id: string,
  ) {
    const res = await this.aiProviderService.delete(id);
    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }
}
