import { HoppRESTReqBody } from "@hoppscotch/data"
import * as S from "fp-ts/string"
import * as RA from "fp-ts/ReadonlyArray"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { tupleToRecord } from "./functional/record"
import { safeParseJSON } from "./functional/json"

/**
 * Detects the content type of the input string
 * @param rawData String for which content type is to be detected
 * @returns Content type of the data
 */
export function detectContentType(
  rawData: string
): HoppRESTReqBody["contentType"] {
  let contentType: HoppRESTReqBody["contentType"] = "text/plain"

  if (safeParseJSON(rawData)._tag === "Some") contentType = "application/json"
  else if (/([^&=]+)=([^&=]+)/.test(rawData)) {
    contentType = "application/x-www-form-urlencoded"
  } else {
    contentType = pipe(
      rawData.match(/^-{2,}.+\\r\\n/),
      O.fromNullable,
      O.filter((boundaryMatch) => boundaryMatch && boundaryMatch.length > 0),
      O.match(
        () => "text/plain",
        (_) => "multipart/form-data"
      )
    )
  }

  return contentType
}

/**
 * Parses provided string according to the content type
 * @param rawData Data to be parsed
 * @param contentType Content type of the data
 * @param boundary Optional parameter required for multipart/form-data content type
 * @returns Option of parsed body as string or Record object for multipart/form-data
 */
export function parseBody(
  rawData: string,
  contentType: HoppRESTReqBody["contentType"],
  rawContentType?: string
): O.Option<string | Record<string, string>> {
  switch (contentType) {
    case "application/json": {
      return pipe(
        rawData,
        safeParseJSON,
        O.map((parsedJSON) => JSON.stringify(parsedJSON, null, 2)),
        // O.getOrElse(() => O.some("{}")),
        O.match(() => O.some("{}"), O.some)
      )
    }

    case "application/x-www-form-urlencoded": {
      return pipe(
        rawData,
        O.fromNullable,
        O.map(decodeURIComponent),
        O.chain((rd) =>
          pipe(rd.match(/(([^&=]+)=?([^&=]+))/g), O.fromNullable)
        ),
        O.filter((pairs) => pairs !== null && pairs.length > 0),
        O.map((pairs) => pairs.map((p) => p.replace("=", ": ")).join("\n"))
      )
    }

    case "multipart/form-data": {
      return pipe(
        O.Do,

        O.bind("boundary", () =>
          pipe(
            rawContentType,
            O.fromNullable,
            O.match(
              () =>
                pipe(
                  rawData.match(/^-{2,}.+\\r\\n/),
                  O.fromNullable,
                  O.filter(
                    (boundaryMatch) => boundaryMatch && boundaryMatch.length > 1
                  ),
                  O.map((matches) => matches[0])
                ),
              (rct) =>
                pipe(
                  rct.match(/boundary=(.+)/),
                  O.fromNullable,
                  O.filter(
                    (boundaryContentMatch) =>
                      boundaryContentMatch && boundaryContentMatch.length > 1
                  ),
                  O.filter((matches) =>
                    rawData
                      .replaceAll("\\r\\n", "")
                      .endsWith("--" + matches[1] + "--")
                  ),
                  O.map((matches) => "--" + matches[1])
                )
            )
          )
        ),

        O.map(({ boundary }) =>
          pipe(
            rawData,
            S.split(boundary),
            RA.filter((p) => p !== "" && p.includes("name")),
            RA.map((p) =>
              pipe(
                p.replaceAll(/[\r\n]+/g, "\r\n"),
                S.split("\\r\\n"),
                RA.filter((q) => q !== "")
              )
            ),
            RA.filterMap((p) =>
              pipe(
                p[0].match(/name=(.+)$/),
                O.fromNullable,
                O.filter((nameMatch) => nameMatch.length > 0),
                O.map((nameMatch) => {
                  const name = nameMatch[0]
                    .replaceAll(/"/g, "")
                    .split("=", 2)[1]
                  return [name, p[0].includes("filename") ? "" : p[1]] as [
                    string,
                    string
                  ]
                })
              )
            ),
            RA.toArray
          )
        ),

        O.filter((arr) => arr.length > 0),
        O.map(tupleToRecord)
      )
    }

    case "application/hal+json":
    case "application/ld+json":
    case "application/vnd.api+json":
    case "application/xml":
    case "text/html":
    case "text/plain":
    default:
      return O.some(rawData)
  }
}
