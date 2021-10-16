import { GraphCacheUpdaters, MyTeamsDocument } from "../graphql"

export const updatesDef: GraphCacheUpdaters = {
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
        cache.resolve(
          {
            __typename: "Team",
            id: teamID,
          },
          "members"
        ) as string[]
      )
        .map((x) => [x, cache.resolve(x, "user") as string])
        .map(([key, userKey]) => [key, cache.resolve(userKey, "uid") as string])
        .filter(([_key, uid]) => uid !== userUid)
        .map(([key]) => key)

      cache.link({ __typename: "Team", id: teamID }, "members", newMembers)
    },
  },
}
