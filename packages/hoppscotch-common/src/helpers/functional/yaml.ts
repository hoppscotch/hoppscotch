import yaml from "js-yaml"
import * as O from "fp-ts/Option"
import { safeParseJSON } from "./json"
import { pipe } from "fp-ts/function"

export const safeParseYAML = (str: string) => O.tryCatch(() => yaml.load(str))

export const safeParseJSONOrYAML = (str: string) =>
  pipe(
    str,
    safeParseJSON,
    O.match(
      () => safeParseYAML(str),
      (data) => O.of(data)
    )
  )
