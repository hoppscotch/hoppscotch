import { Environment } from "@hoppscotch/data"
import { TeamEnvironment } from "../teams/TeamEnvironment"

type SortOrder = "asc" | "desc"

type EnvironmentWithIndex<T> = {
  env: T
  index: number
}

/**
 * Sorts an array of environments alphabetically based on a specified name getter function.
 *
 * @template T - The type of the environments array elements.
 * @param {T[]} environments - The array of environments to be sorted.
 * @param {SortOrder} order - The sort order, either "asc" for ascending or "desc" for descending.
 * @param {(env: T) => string} getName - The function that retrieves the name from an environment entry.
 * @returns {EnvironmentWithIndex<T>[]} - The sorted array of environments with their original indices.
 */
const sortEnvironmentsAlphabetically = <T>(
  environments: T[],
  order: SortOrder,
  getName: (env: T) => string
): EnvironmentWithIndex<T>[] => {
  return [...environments]
    .map((env, index) => ({
      env,
      index,
    }))
    .sort((a, b) => {
      const comparison = getName(a.env)
        .toLocaleLowerCase()
        .localeCompare(getName(b.env).toLocaleLowerCase())

      return order === "asc" ? comparison : -comparison
    })
}

/**
 * Returns an object with sorted personal environments and index.
 * @param {Environment[]} environments Array of personal environments.
 * @param {SortOrder} order Sorting order.
 * @returns {EnvironmentWithIndex<Environment>[]} Object with sorted environments and their index.
 */
export const sortPersonalEnvironmentsAlphabetically = (
  environments: Environment[],
  order: SortOrder
): EnvironmentWithIndex<Environment>[] => {
  return sortEnvironmentsAlphabetically<Environment>(
    environments,
    order,
    (env) => env.name
  )
}

/**
 * Returns an object with sorted team environments and index.
 * @param environments Array of team environments.
 * @param order Sorting order.
 * @returns {EnvironmentWithIndex<TeamEnvironment>[]} Object with sorted environments and their index.
 */
export const sortTeamEnvironmentsAlphabetically = (
  environments: TeamEnvironment[],
  order: SortOrder
): EnvironmentWithIndex<TeamEnvironment>[] => {
  return sortEnvironmentsAlphabetically<TeamEnvironment>(
    environments,
    order,
    (env) => env.environment.name
  )
}
