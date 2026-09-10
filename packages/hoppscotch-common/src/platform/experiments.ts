import * as E from "fp-ts/Either"

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
    chat?: (
      messages: { role: "user" | "assistant"; content: string | unknown[] }[],
      context: string
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
          usage?: {
            input_tokens: number
            cache_read_input_tokens: number
            cache_creation_input_tokens: number
            output_tokens: number
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
