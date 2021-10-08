import { UpdatesConfig } from "@urql/exchange-graphcache"
import { MyTeamsDocument } from "../graphql"

export const updatesDef: Partial<UpdatesConfig> = {
  Mutation: {
    deleteTeam: (_r, { teamID }, cache, _info) => {
      cache.updateQuery(
        {
          query: MyTeamsDocument,
        },
        (data: any) => {
          data.myTeams = (data as any).myTeams.filter(
            (x: any) => x.id !== teamID
          )

          return data
        }
      )

      cache.invalidate({
        __typename: "Team",
        id: teamID as any,
      })
    },
    leaveTeam: (_r, { teamID }, cache, _info) => {
      cache.updateQuery(
        {
          query: MyTeamsDocument,
        },
        (data: any) => {
          data.myTeams = (data as any).myTeams.filter(
            (x: any) => x.id !== teamID
          )

          return data
        }
      )

      cache.invalidate({
        __typename: "Team",
        id: teamID as any,
      })
    },
    createTeam: (result, _args, cache, _info) => {
      cache.updateQuery(
        {
          query: MyTeamsDocument,
        },
        (data: any) => {
          data.myTeams.push(result.createTeam)
          return data
        }
      )
    },
    removeTeamMember: (_result, { teamID, userUid }, cache) => {
      const newMembers = (
        cache.resolve(
          {
            __typename: "Team",
            id: teamID as string,
          },
          "members"
        ) as string[]
      )
        .map((x) => [x, cache.resolve(x, "user") as string])
        .map(([key, userKey]) => [key, cache.resolve(userKey, "uid") as string])
        .filter(([_key, uid]) => uid !== userUid)
        .map(([key]) => key)

      cache.link(
        { __typename: "Team", id: teamID as string },
        "members",
        newMembers
      )
    },
  },
}
