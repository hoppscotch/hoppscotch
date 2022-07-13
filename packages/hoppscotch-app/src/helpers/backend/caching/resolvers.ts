import {
  GraphCacheResolvers,
  Shortcode,
  Team,
  TeamInvitation,
  WithTypename,
} from "../graphql"

export const resolversDef: GraphCacheResolvers = {
  Query: {
    team: (_parent, { teamID }, _cache, _info) =>
      <WithTypename<Team>>{
        __typename: "Team" as const,
        id: teamID,
      },
    user: (_parent, { uid }, _cache, _info) => ({
      __typename: "User",
      uid,
    }),
    teamInvitation: (_parent, args, _cache, _info) =>
      <WithTypename<TeamInvitation>>{
        __typename: "TeamInvitation",
        id: args.inviteID,
      },
    shortcode: (_parent, args, _cache, _info) =>
      <WithTypename<Shortcode>>{
        __typename: "Shortcode",
        id: args.code,
      },
  },
}
