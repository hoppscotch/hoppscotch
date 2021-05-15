import { TeamRequest } from "./TeamRequest"

/**
 * Defines how a Team Collection is represented in the TeamCollectionAdapter
 */
export interface TeamCollection {
  id: string
  title: string
  children: TeamCollection[] | null
  requests: TeamRequest[] | null
}
