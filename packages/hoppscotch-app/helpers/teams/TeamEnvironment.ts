import { Environment } from "@hoppscotch/data"

/**
 * Defines how a Team Environment is represented in the TeamEnvironmentAdapter
 */
export interface TeamEnvironment {
  id: string
  teamID: string
  environment: Environment
}
