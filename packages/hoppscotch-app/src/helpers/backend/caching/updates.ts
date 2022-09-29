import { gql } from "@urql/core"
import { GraphCacheUpdaters } from "../graphql"

export const updatesDef: GraphCacheUpdaters = {
  Subscription: {
    teamMemberAdded: (_r, { teamID }, cache) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamMembers"
      )
    },
    teamMemberUpdated: (_r, { teamID }, cache) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamMembers"
      )

      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "myRole"
      )
    },
    teamMemberRemoved: (_r, { teamID }, cache) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamMembers"
      )
    },
    teamInvitationAdded: (_r, { teamID }, cache) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamInvitations"
      )
    },
    teamInvitationRemoved: (_r, { teamID }, cache) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamInvitations"
      )
    },
  },
  Mutation: {
    createTeamInvitation: (result, _args, cache) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: result.createTeamInvitation.teamID!,
        },
        "teamInvitations"
      )
    },
    acceptTeamInvitation: (_result, _args, cache) => {
      cache.invalidate({ __typename: "Query" }, "myTeams")
    },
    revokeTeamInvitation: (_result, args, cache) => {
      const targetTeamID = cache.resolve(
        {
          __typename: "TeamInvitation",
          id: args.inviteID,
        },
        "teamID"
      )

      if (typeof targetTeamID === "string") {
        const newInvites = (
          cache.resolve(
            {
              __typename: "Team",
              id: targetTeamID,
            },
            "teamInvitations"
          ) as string[]
        ).filter(
          (inviteKey) =>
            inviteKey !==
            cache.keyOfEntity({
              __typename: "TeamInvitation",
              id: args.inviteID,
            })
        )

        cache.link(
          { __typename: "Team", id: targetTeamID },
          "teamInvitations",
          newInvites
        )
      }
    },
    createShortcode: (result, _args, cache) => {
      cache.writeFragment(
        gql`
          fragment _ on Shortcode {
            id
            request
          }
        `,
        {
          id: result.createShortcode.id,
          request: result.createShortcode.request,
        }
      )
    },
  },
}
