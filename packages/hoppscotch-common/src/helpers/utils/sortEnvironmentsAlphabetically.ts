import { Environment } from "@hoppscotch/data"
import { TeamEnvironment } from "../teams/TeamEnvironment"

type SortOrder = "asc" | "desc"

const sortAlphabetically = (a: string, b: string, order: SortOrder) => {
  return order === "asc"
    ? a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase())
    : b.toLocaleLowerCase().localeCompare(a.toLocaleLowerCase())
}

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
