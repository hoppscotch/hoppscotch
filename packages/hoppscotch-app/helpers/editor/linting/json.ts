import { convertIndexToLineCh } from "../utils"
import { LinterDefinition, LinterResult } from "./linter"
import jsonParse from "~/helpers/jsonParse"

const linter: LinterDefinition = (text) => {
  try {
    jsonParse(text)
    return Promise.resolve([])
  } catch (e: any) {
    return Promise.resolve([
      <LinterResult>{
        from: convertIndexToLineCh(text, e.start),
        to: convertIndexToLineCh(text, e.end),
        message: e.message,
        severity: "error",
      },
    ])
  }
}

export default linter
