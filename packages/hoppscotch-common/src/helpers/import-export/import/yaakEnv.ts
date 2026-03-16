import { Environment, EnvironmentSchemaVersion } from "@hoppscotch/data"

import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { uniqueID } from "~/helpers/utils/uniqueID"

type YaakVariable = {
  enabled: boolean
  name: string
  value: string
}

type YaakEnvironment = {
  model: "environment"
  id: string
  name: string
  variables: YaakVariable[]
}

type YaakExport = {
  yaakVersion: string
  yaakSchema: number
  timestamp: string
  resources: {
    environments?: YaakEnvironment[]
  }
}

export const yaakEnvImporter = (contents: string[]) => {
  const parsedContents = contents.map((str) => safeParseJSON(str, true))

  if (parsedContents.some((parsed) => O.isNone(parsed))) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const parsed = O.toNullable(parsedContents[0]) as YaakExport | null

  if (!parsed?.resources?.environments) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const environments: Environment[] = parsed.resources.environments.map(
    (env) => ({
      id: uniqueID(),
      v: EnvironmentSchemaVersion,
      name: env.name,

      variables: (env.variables ?? [])
        .filter((v) => v.enabled)
        .map((v) => ({
          key: v.name,
          initialValue: v.value ?? "",
          currentValue: v.value ?? "",
          secret: false,
        })),
    })
  )

  return TE.right(environments)
}
