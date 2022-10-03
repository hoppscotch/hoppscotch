import * as t from "io-ts"

interface TeamNameBrand {
  readonly TeamName: unique symbol
}

export const TeamNameCodec = t.brand(
  t.string,
  (x): x is t.Branded<string, TeamNameBrand> => x.trim().length >= 6,
  "TeamName"
)

export type TeamName = t.TypeOf<typeof TeamNameCodec>
