import * as A from "fp-ts/Array"
import * as RA from "fp-ts/ReadonlyArray"
import * as S from "fp-ts/string"
import { pipe, flow } from "fp-ts/function"
import { stringArrayJoin } from "./functional/array"

export type RawKeyValueEntry = {
  key: string
  value: string
  active: boolean
}

const parseRawKeyValueEntry = (str: string): RawKeyValueEntry => {
  const trimmed = str.trim()
  const inactive = trimmed.startsWith("#")

  const [key, value] = trimmed.split(":").map(S.trim)

  return {
    key: inactive ? key.replaceAll(/^#+\s*/g, "") : key, // Remove comment hash and early space
    value,
    active: !inactive,
  }
}

export const parseRawKeyValueEntries = flow(
  S.split("\n"),
  RA.filter((x) => x.trim().length > 0), // Remove lines which are empty
  RA.map(parseRawKeyValueEntry),
  RA.toArray
)

export const rawKeyValueEntriesToString = (entries: RawKeyValueEntry[]) =>
  pipe(
    entries,
    A.map(({ key, value, active }) =>
      active ? `${key}: ${value}` : `# ${key}: ${value}`
    ),
    stringArrayJoin("\n")
  )
