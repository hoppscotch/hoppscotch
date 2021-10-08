import { ResolverConfig } from "@urql/exchange-graphcache"

export const resolversDef: ResolverConfig = {
  Query: {
    team: (_parent, { teamID }, _cache, _info) => ({
      __typename: "Team",
      id: teamID as any,
    }),
    user: (_parent, { uid }, _cache, _info) => ({
      __typename: "User",
      uid: uid as any,
    }),
  },
}
