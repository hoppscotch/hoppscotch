import { Environment } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"

import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import { initializeDownloadFile } from "."

const getEnvironmentJSON = (
  environmentObj: TeamEnvironment | Environment,
  environmentIndex?: number | "Global" | null
) => {
  const newEnvironment =
    "environment" in environmentObj
      ? cloneDeep(environmentObj.environment)
      : cloneDeep(environmentObj)

  const environmentId =
    environmentIndex || environmentIndex === 0
      ? environmentIndex
      : environmentObj.id

  return environmentId !== null
    ? JSON.stringify(newEnvironment, null, 2)
    : undefined
}

export const exportAsJSON = async (
  environmentObj: Environment | TeamEnvironment,
  environmentIndex?: number | "Global" | null
): Promise<E.Right<string> | E.Left<string>> => {
  const environmentJSON = getEnvironmentJSON(environmentObj, environmentIndex)

  if (!environmentJSON) {
    return E.left("state.download_failed")
  }

  const message = await initializeDownloadFile(
    environmentJSON,
    JSON.parse(environmentJSON).name
  )

  return message
}
