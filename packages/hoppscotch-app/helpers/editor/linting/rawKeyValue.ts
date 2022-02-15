import * as E from "fp-ts/Either"
import { strictParseRawKeyValueEntriesE } from "@hoppscotch/data"
import { convertIndexToLineCh } from "../utils"
import { LinterDefinition, LinterResult } from "./linter"

const linter: LinterDefinition = (text) => {
  const result = strictParseRawKeyValueEntriesE(text)
  if (E.isLeft(result)) {
    const pos = convertIndexToLineCh(text, result.left.pos + 1)

    return Promise.resolve([
      <LinterResult>{
        from: pos,
        to: pos,
        message: result.left.message,
        severity: "error",
      },
    ])
  } else {
    return Promise.resolve([])
  }
}

export default linter
