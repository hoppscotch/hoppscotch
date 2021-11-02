import { GraphCacheUpdaters, MyTeamsDocument } from "../graphql"

export const updatesDef: GraphCacheUpdaters = {
  Subscription: {
    teamMemberAdded: (_r, { teamID }, cache, _info) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamMembers"
      )
    },
    teamMemberUpdated: (_r, { teamID }, cache, _info) => {
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
    teamMemberRemoved: (_r, { teamID }, cache, _info) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamMembers"
      )
    },
    teamInvitationAdded: (_r, { teamID }, cache, _info) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: teamID,
        },
        "teamInvitations"
      )
    },
    teamInvitationRemoved: (_r, { teamID }, cache, _info) => {
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
    deleteTeam: (_r, { teamID }, cache, _info) => {
      cache.updateQuery(
        {
          query: MyTeamsDocument,
        },
        (data) => {
          if (data) {
            data.myTeams = data.myTeams.filter((x) => x.id !== teamID)
          }

          return data
        }
      )

      cache.invalidate({
        __typename: "Team",
        id: teamID,
      })
    },
    leaveTeam: (_r, { teamID }, cache, _info) => {
      cache.updateQuery(
        {
          query: MyTeamsDocument,
        },
        (data) => {
          if (data) {
            data.myTeams = data.myTeams.filter((x) => x.id !== teamID)
          }

          return data
        }
      )

      cache.invalidate({
        __typename: "Team",
        id: teamID,
      })
    },
    createTeam: (result, _args, cache, _info) => {
      cache.updateQuery(
        {
          query: MyTeamsDocument,
        },
        (data) => {
          if (data) data.myTeams.push(result.createTeam as any)
          return data
        }
      )
    },
    removeTeamMember: (_result, { teamID, userUid }, cache) => {
      const newMembers = (
        (cache.resolve(
          {
            __typename: "Team",
            id: teamID,
          },
          "teamMembers"
        ) as string[]) ?? []
      )
        .map((x) => [x, cache.resolve(x, "user") as string])
        .map(([key, userKey]) => [key, cache.resolve(userKey, "uid") as string])
        .filter(([_key, uid]) => uid !== userUid)
        .map(([key]) => key)
      cache.link({ __typename: "Team", id: teamID }, "teamMembers", newMembers)
    },
    createTeamInvitation: (result, _args, cache, _info) => {
      cache.invalidate(
        {
          __typename: "Team",
          id: result.createTeamInvitation.teamID!,
        },
        "teamInvitations"
      )
    },
    acceptTeamInvitation: (_result, _args, cache, _info) => {
      cache.invalidate({ __typename: "Query" }, "myTeams")
    },
    revokeTeamInvitation: (_result, args, cache, _info) => {
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
  },
}
