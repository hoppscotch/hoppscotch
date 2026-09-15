import type { Component } from "vue"

import IconAnthropic from "~icons/brands/anthropic"
import IconAWS from "~icons/brands/aws"
import IconAzure from "~icons/brands/azure"
import IconDeepSeek from "~icons/brands/deepseek"
import IconGemini from "~icons/brands/gemini"
import IconOllama from "~icons/brands/ollama"
import IconOpenAI from "~icons/brands/openai"
import IconPlug from "~icons/lucide/plug"

/**
 * A mark per provider preset, mirroring the admin dashboard's own map.
 *
 * Imported statically so the bundler keeps only these, and so a preset the
 * backend gains before this map does falls back rather than failing to resolve.
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
  "openai-compatible": IconOllama,
  gemini: IconGemini,
}

/**
 * The mark for a preset, or a neutral one where there is no vendor to name.
 *
 * `custom` falls through on purpose: it means an endpoint this build does not
 * recognise, so showing a vendor's logo would be a claim about something
 * unknown.
 */
export const logoForPreset = (preset: string): Component =>
  LOGOS[preset] ?? IconPlug
