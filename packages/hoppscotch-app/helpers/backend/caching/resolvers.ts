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
    teamInvitation: (_parent, args, _cache, _info) => ({
      __typename: "TeamInvitation",
      id: args.inviteID,
    }),
    shortcode: (_parent, args, _cache, _info) => ({
      __typename: "Shortcode",
      id: args.code,
    }),
  },
}
