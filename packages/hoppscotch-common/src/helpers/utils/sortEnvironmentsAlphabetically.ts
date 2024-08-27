import { Environment } from "@hoppscotch/data"
import { TeamEnvironment } from "../teams/TeamEnvironment"

type SortOrder = "asc" | "desc"

/**
 * Sorts two strings alphabetically
 * @param a First string
 * @param b Second string
 * @param order Sorting order
 * @returns 1 if a comes before b, -1 if b comes before a
 */
const sortAlphabetically = (a: string, b: string, order: SortOrder) => {
  return order === "asc"
    ? a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase())
    : b.toLocaleLowerCase().localeCompare(a.toLocaleLowerCase())
}

/**
 * Returns an object with sorted personal environments and index
 * @param environments Array of personal environments
 * @param order Sorting order
 * @returns Object with sorted environment and index
 */
export const sortPersonalEnvironmentsAlphabetically = (
  environments: Environment[],
  order: SortOrder
) => {
  return [...environments]
    .map((env, index) => ({
      env,
      index,
    }))
    .sort((a, b) => sortAlphabetically(a.env.name, b.env.name, order))
}

/**
 * Returns an object with sorted team environments and index
 * @param environments Array of team environments
 * @param order Sorting order
 * @returns Object with sorted environment and index
 */
export const sortTeamEnvironmentsAlphabetically = (
  environments: TeamEnvironment[],
  order: SortOrder
) => {
  return [...environments]
    .map((env, index) => ({
      env,
      index,
    }))
    .sort((a, b) =>
      sortAlphabetically(a.env.environment.name, b.env.environment.name, order)
    )
}
