import { GraphCacheKeysConfig } from "../graphql"

export const keyDefs: GraphCacheKeysConfig = {
  User: (data) => data.uid!,
  TeamMember: (data) => data.membershipID!,
  Team: (data) => data.id!,
  TeamInvitation: (data) => data.id!,
}
