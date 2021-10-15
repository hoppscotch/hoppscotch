import { GraphCacheOptimisticUpdaters } from "../graphql"

export const optimisticDefs: GraphCacheOptimisticUpdaters = {
  deleteTeam: () => true,
  leaveTeam: () => true,
  renameTeam: ({ teamID, newName }) => ({
    __typename: "Team",
    id: teamID,
    name: newName,
  }),
  removeTeamMember: () => true,
}
