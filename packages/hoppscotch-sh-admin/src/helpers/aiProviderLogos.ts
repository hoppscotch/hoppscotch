import type { Component } from 'vue';

import IconAnthropic from '~icons/ai/anthropic';
import IconAWS from '~icons/ai/aws';
import IconAzure from '~icons/ai/azure';
import IconDeepSeek from '~icons/ai/deepseek';
import IconGemini from '~icons/ai/gemini';
import IconOpenAI from '~icons/ai/openai';
import IconOllama from '~icons/ai/ollama';
import IconPlug from '~icons/lucide/plug';

/**
 * A mark per provider preset. The SVGs are vendored from Simple Icons (CC0).
 *
 * Imported statically rather than resolved by name so the bundler keeps only
 * these seven, and so a preset added to the backend without a matching icon
 * here degrades to the neutral mark instead of failing to resolve at runtime.
 */
const LOGOS: Record<string, Component> = {
  anthropic: IconAnthropic,
  openai: IconOpenAI,
  deepseek: IconDeepSeek,
  // Bedrock is an AWS service and Azure OpenAI a Microsoft one, so both carry
  // the platform's mark rather than a model vendor's.
  bedrock: IconAWS,
  azure: IconAzure,
  // Stands in for local runtimes generally, not just Ollama.
  'openai-compatible': IconOllama,
  gemini: IconGemini,
};

/**
 * The mark for a preset, or a neutral one where there is no vendor to name.
 *
 * `custom` means "an endpoint this build does not recognise", so it falls
 * through here on purpose: showing a vendor's logo for it would be a claim
 * about something we know nothing about.
 */
export const logoForPreset = (preset: string): Component =>
  LOGOS[preset] ?? IconPlug;
