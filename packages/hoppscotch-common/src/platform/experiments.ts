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
        }
      >
    >
  }
}
