import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"

import { IMPORTER_INVALID_FILE_FORMAT } from ".."

import { z } from "zod"
import {
  EnvironmentSchemaVersion,
  NonSecretEnvironment,
} from "@hoppscotch/data"
import { safeParseJSONOrYAML } from "~/helpers/functional/yaml"
import { uniqueID } from "~/helpers/utils/uniqueID"

const insomniaResourcesSchema = z.object({
  resources: z.array(
    z
      .object({
        _type: z.string(),
      })
      .passthrough()
  ),
})

const insomniaEnvSchema = z.object({
  _type: z.literal("environment"),
  name: z.string(),
  data: z.record(z.string()),
})

const parseInsomniaValue = (value: unknown) => {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value)
  }
  return String(value)
}

const insomniaV5Schema = z.object({
  environments: z.object({
    name: z.string(),
    data: z.record(z.any()),
    subEnvironments: z
      .array(
        z.object({
          name: z.string(),
          data: z.record(z.any()),
        })
      )
      .optional(),
  }),
})

export const replaceInsomniaTemplating = (expression: string) => {
  const regex = /\{\{ _\.([^}]+) \}\}/g
  return expression.replaceAll(regex, "<<$1>>")
}

export const insomniaEnvImporter = (contents: string[]) => {
  const parsedContents = contents.map((str) => safeParseJSONOrYAML(str))
  if (parsedContents.some((parsed) => O.isNone(parsed))) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const parsedValues = parsedContents.map((parsed) => O.toNullable(parsed))
  const environments: NonSecretEnvironment[] = []

  // Valid flag to check if at least one file was valid
  let hasWrappedSuccess = false

  parsedValues.forEach((parsedValue) => {
    if (!parsedValue) return

    // Try V4 (Resources Array)
    const v4Result = insomniaResourcesSchema.safeParse(parsedValue)
    if (v4Result.success) {
      hasWrappedSuccess = true
      v4Result.data.resources
        .filter((resource) => resource._type === "environment")
        .forEach((envResource) => {
          const envResourceData = envResource.data as Record<string, unknown>
          const stringifiedData: Record<string, string> = {}

          Object.keys(envResourceData).forEach((key) => {
            stringifiedData[key] = parseInsomniaValue(envResourceData[key])
          })

          const processedEnv = { ...envResource, data: stringifiedData }
          const parsed = insomniaEnvSchema.safeParse(processedEnv)

          if (parsed.success) {
            environments.push({
              id: uniqueID(),
              v: EnvironmentSchemaVersion,
              name: parsed.data.name,
              variables: Object.entries(parsed.data.data).map(
                ([key, value]) => ({
                  key,
                  initialValue: value,
                  currentValue: value,
                  secret: false,
                })
              ) as any,
            })
          }
        })
      return
    }

    // Try V5 (Nested Environments)
    const v5Result = insomniaV5Schema.safeParse(parsedValue)

    if (v5Result.success) {
      hasWrappedSuccess = true
      const rootEnv = v5Result.data.environments

      // Add Base Environment
      environments.push({
        id: uniqueID(),
        v: EnvironmentSchemaVersion,
        name: rootEnv.name,
        variables: Object.entries(rootEnv.data).map(([key, value]) => ({
          key,
          initialValue: parseInsomniaValue(value),
          currentValue: parseInsomniaValue(value),
          secret: false,
        })) as any,
      })

      // Add Sub Environments
      rootEnv.subEnvironments?.forEach((subEnv) => {
        environments.push({
          id: uniqueID(),
          v: EnvironmentSchemaVersion,
          name: subEnv.name,
          variables: Object.entries(subEnv.data).map(([key, value]) => ({
            key,
            initialValue: parseInsomniaValue(value),
            currentValue: parseInsomniaValue(value),
            secret: false,
          })) as any,
        })
      })
    }
  })

  if (!hasWrappedSuccess) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const processedEnvironments = environments.map((env) => ({
    ...(env as any),
    variables: (env.variables as any[]).map((variable: any) => ({
      ...variable,
      initialValue: replaceInsomniaTemplating(variable.initialValue),
      currentValue: replaceInsomniaTemplating(variable.currentValue),
    })),
  }))

  // The first environment is considered the Base/Global source
  // (especially for V5 where it stems from the root property)
  const globalEnvs = processedEnvironments.slice(0, 1)
  const otherEnvs = processedEnvironments.slice(1)

  return TE.right({ globalEnvs, otherEnvs })
}
