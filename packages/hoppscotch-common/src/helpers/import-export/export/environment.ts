import { Environment } from "@hoppscotch/data"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import { cloneDeep } from "lodash-es"

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
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url

  // Extracts the path from url, removes fragment identifier and query parameters if any, appends the ".json" extension, and assigns it
  a.download = `${url.split("/").pop()!.split("#")[0].split("?")[0]}.json`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, 0)
  return true
}
