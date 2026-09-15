import * as E from "fp-ts/Either"

export type AIChatModelOption = {
  connectionID: string
  connectionLabel: string
  /** Provider preset, so the picker can show the right mark. */
  preset: string
  model: string
  isDefault: boolean
}

/** A named prompt an admin defined, merged over the built-in set. */
export type AIChatSkillDef = {
  slug: string
  title: string
  description: string
  prompt: string
}

/**
 * Which registered connection and model a turn should be served on.
 *
 * Both fields travel together on purpose: a model sent without its connection
 * is resolved against the instance default, which rejects any model that
 * default does not happen to offer.
 */
export type AIChatSelection = {
  connectionID: string
  model: string
}

export type ExperimentsPlatformDef = {
  aiExperiments?: {
    enableAIExperiments: boolean
    generateRequestName?: (
      requestInfo: string,
      namingStyle: string
    ) => Promise<
      E.Either<
        string,
        {
          request_name: string
          trace_id: string
        }
      >
    >
    modifyRequestBody?: (
      requestBody: string,
      userPrompt: string
    ) => Promise<
      E.Either<
        string,
        {
          modified_body: string
          trace_id: string
        }
      >
    >
    submitFeedback?: (
      rating: -1 | 1,
      traceID: string
    ) => Promise<E.Either<string, void>>
    modifyPreRequestScript?: (
      requestInfo: string,
      userPrompt: string
    ) => Promise<
      E.Either<string, { modified_script: string; trace_id: string }>
    >
    modifyTestScript?: (
      requestInfo: string,
      userPrompt: string
    ) => Promise<
      E.Either<string, { modified_script: string; trace_id: string }>
    >
    /**
     * Whether the assistant is switched on for this instance, and which models
     * it offers. Absent where the platform has no notion of a server-side
     * assistant configuration.
     */
    getChatAvailability?: () => Promise<
      E.Either<
        string,
        {
          enabled: boolean
          models: AIChatModelOption[]
          skills: AIChatSkillDef[]
        }
      >
    >
    chat?: (
      messages: { role: "user" | "assistant"; content: string | unknown[] }[],
      context: string,
      selection?: AIChatSelection
    ) => Promise<
      E.Either<
        string,
        {
          content: string
          tool_calls: {
            id: string
            name: string
            input: Record<string, unknown>
          }[]
          trace_id: string
          model?: string
          /** Counters are individually optional — only Anthropic reports all four. */
          usage?: {
            input_tokens?: number
            cache_read_input_tokens?: number
            cache_creation_input_tokens?: number
            output_tokens?: number
          }
          /** Full assistant blocks to echo back unchanged on the next step. */
          assistant_content?: unknown[]
          /** Deferred tools the model discovered via tool search this step. */
          loaded_tools?: string[]
        }
      >
    >
  }
}
