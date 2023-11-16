import { Environment } from "@hoppscotch/data"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import { cloneDeep } from "lodash-es"
import { platform } from "~/platform"

const getEnvironmentJson = (
  environmentObj: TeamEnvironment | Environment,
  environmentIndex?: number | "Global" | null
) => {
  const newEnvironment =
    "environment" in environmentObj
      ? cloneDeep(environmentObj.environment)
      : cloneDeep(environmentObj)

  delete newEnvironment.id

  const environmentId =
    environmentIndex || environmentIndex === 0
      ? environmentIndex
      : environmentObj.id

  return environmentId !== null
    ? JSON.stringify(newEnvironment, null, 2)
    : undefined
}

export const exportAsJSON = (
  environmentObj: Environment | TeamEnvironment,
  environmentIndex?: number | "Global" | null
): boolean => {
  const dataToWrite = getEnvironmentJson(environmentObj, environmentIndex)

  if (!dataToWrite) return false

  const file = new Blob([dataToWrite], { type: "application/json" })
  const url = URL.createObjectURL(file)

  URL.revokeObjectURL(url)

  platform.io.saveFileWithDialog({
    data: dataToWrite,
    contentType: "application/json",
    // Extracts the path from url, removes fragment identifier and query parameters if any, appends the ".json" extension, and assigns it
    suggestedFilename: `${
      url.split("/").pop()!.split("#")[0].split("?")[0]
    }.json`,
    filters: [
      {
        name: "JSON file",
        extensions: ["json"],
      },
    ],
  })

  return true
}
