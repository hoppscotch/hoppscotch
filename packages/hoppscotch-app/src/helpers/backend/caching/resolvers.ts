import {
  GraphCacheResolvers,
  Shortcode,
  Team,
  TeamInvitation,
  WithTypename,
} from "../graphql"

export const resolversDef: GraphCacheResolvers = {
  Query: {
    team: (_parent, { teamID }) =>
      <WithTypename<Team>>{
        __typename: "Team" as const,
        id: teamID,
      },
    user: (_parent, { uid }) => ({
      __typename: "User",
      uid,
    }),
    teamInvitation: (_parent, args) =>
      <WithTypename<TeamInvitation>>{
        __typename: "TeamInvitation",
        id: args.inviteID,
      },
    shortcode: (_parent, args) =>
      <WithTypename<Shortcode>>{
        __typename: "Shortcode",
        id: args.code,
      },
  },
}
