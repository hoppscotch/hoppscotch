import * as E from "fp-ts/Either"

export type ExperimentsPlatformDef = {
  aiExperiments?: {
    enableAIExperiments: boolean
    generateRequestName: (
      requestInfo: string
    ) => Promise<E.Either<string, string>>
  }
}
