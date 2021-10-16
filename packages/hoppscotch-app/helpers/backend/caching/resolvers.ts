import { GraphCacheResolvers } from "../graphql"

export const resolversDef: GraphCacheResolvers = {
  Query: {
    team: (_parent, { teamID }, _cache, _info) => ({
      __typename: "Team",
      id: teamID,
    }),
    user: (_parent, { uid }, _cache, _info) => ({
      __typename: "User",
      uid,
    }),
  },
}
