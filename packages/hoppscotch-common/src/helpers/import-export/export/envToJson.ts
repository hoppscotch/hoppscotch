import { Environment } from "@hoppscotch/data"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"

const getEnvironmentJson = (
  environment: TeamEnvironment | Environment,
  environmentIndex?: number | "Global" | null
) => {
  if ("environment" in environment) {
    const { ...newEnvironment } = environment.environment
    delete newEnvironment.id

    return environment.id !== null
      ? JSON.stringify(newEnvironment, null, 2)
      : undefined
  } else {
    const { ...newEnvironment } = environment
    delete newEnvironment.id

    return environmentIndex !== null
      ? JSON.stringify(newEnvironment, null, 2)
      : undefined
  }
}

export const exportJSON = (
  environment: Environment | TeamEnvironment,
  environmentIndex?: number | "Global" | null
): boolean => {
  const dataToWrite = environmentIndex
    ? getEnvironmentJson(environment, environmentIndex)
    : getEnvironmentJson(environment)

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
