import { KeyingConfig } from "@urql/exchange-graphcache"

export const keyDefs: KeyingConfig = {
  User: (data) => (data as any).uid,
  TeamMember: (data) => (data as any).membershipID,
  Team: (data) => data.id as any,
}
