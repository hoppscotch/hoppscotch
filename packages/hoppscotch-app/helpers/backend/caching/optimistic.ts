import { OptimisticMutationConfig } from "@urql/exchange-graphcache"

export const optimisticDefs: OptimisticMutationConfig = {
  deleteTeam: () => true,
  leaveTeam: () => true,
  renameTeam: ({ teamID, newName }) => ({
    __typename: "Team",
    id: teamID,
    name: newName,
  }),
  removeTeamMember: () => true,
  // TODO: updateTeamMemberRole
}
