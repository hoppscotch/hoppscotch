import { UpdatesConfig } from "@urql/exchange-graphcache"
import gql from "graphql-tag"

export const updatesDef: Partial<UpdatesConfig> = {
  Mutation: {
    deleteTeam: (_r, { teamID }, cache, _info) => {
      cache.updateQuery(
        {
          query: gql`
            query {
              myTeams {
                id
              }
            }
          `,
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
          query: gql`
            query {
              myTeams {
                id
              }
            }
          `,
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
          query: gql`
            {
              myTeams {
                id
              }
            }
          `,
        },
        (data: any) => {
          data.myTeams.push(result.createTeam)
          return data
        }
      )
    },
    renameTeam: (_result, { teamID, newName }, cache, _info) => {
      cache.updateQuery(
        {
          query: gql`
            query GetTeam($teamID: ID!) {
              team(teamID: $teamID) {
                id
                name
              }
            }
          `,
          variables: {
            teamID,
          },
        },
        (data: any) => {
          data.team.name = newName
          return data
        }
      )
    },
    removeTeamMember: (_result, { userUid, teamID }, cache) => {
      cache.updateQuery(
        {
          query: gql`
            query GetTeam($teamID: ID!) {
              team(teamID: $teamID) {
                members {
                  user {
                    uid
                  }
                }
              }
            }
          `,
          variables: {
            teamID,
          },
        },
        (data: any) => {
          data.team.members = data.team.members.filter(
            (x: any) => x.user.uid !== userUid
          )
          return data
        }
      )
    },
    updateTeamMemberRole: (result, { userUid, teamID }, cache) => {
      cache.updateQuery(
        {
          query: gql`
            query GetTeam($teamID: ID!) {
              team(teamID: $teamID) {
                members {
                  user {
                    uid
                  }
                }
              }
            }
          `,
          variables: {
            teamID,
          },
        },
        (data: any) => {
          data.team.members = data.team.members.map((x: any) =>
            x.user.uid !== userUid ? x : result
          )
          return data
        }
      )
    },
  },
}
