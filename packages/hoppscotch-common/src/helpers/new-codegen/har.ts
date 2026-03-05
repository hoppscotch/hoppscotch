import * as RA from "fp-ts/ReadonlyArray"
import * as S from "fp-ts/string"
import { pipe, flow } from "fp-ts/function"
import * as Har from "har-format"
import { HoppRESTRequest } from "@hoppscotch/data"
import { FieldEquals, objectFieldIncludes } from "../typeutils"

// Hoppscotch support HAR Spec 1.2
// For more info on the spec: http://www.softwareishard.com/blog/har-12-spec/

const splitHarQueryParams = (sep: string) => {
  return (s: string): Array<string> => {
    const out = pipe(s, S.split(sep))
    const [key, ...rest] = out
    return [key, rest.join(sep)] // Split by the first colon and join the rest
  }
}

const buildHarHeaders = (req: HoppRESTRequest): Har.Header[] => {
  return req.headers
    .filter((header) => header.active)
    .map((header) => ({
      name: header.key,
      value: header.value,
    }))
}

const buildHarQueryStrings = (req: HoppRESTRequest): Har.QueryString[] => {
  return req.params
    .filter((param) => param.active)
    .map((param) => ({
      name: param.key,
      value: param.value,
    }))
}

const buildHarPostParams = (
  req: HoppRESTRequest &
    FieldEquals<HoppRESTRequest, "method", ["POST", "PUT"]> & {
      body: {
        contentType: "application/x-www-form-urlencoded" | "multipart/form-data"
      }
    }
): Har.Param[] => {
  // URL Encoded strings have a string style of contents
  if (req.body.contentType === "application/x-www-form-urlencoded") {
    return pipe(
      req.body.body,
      S.split("\n"),
      RA.map(
        flow(
          // Define how each lines are parsed

          splitHarQueryParams(":"), // Split by the first ":"
          RA.map(S.trim), // Remove trailing spaces in key/value begins and ends
          ([key, value]) => ({
            // Convert into a proper key value definition
            name: key,
            value: value ?? "", // Value can be undefined (if no ":" is present)
          })
        )
      ),
      RA.toArray
    )
  }
  // FormData has its own format
  return req.body.body.flatMap((entry) => {
    if (entry.isFile) {
      // We support multiple files
      const values = Array.isArray(entry.value) ? entry.value : [entry.value]
      return values.map(
        (file) =>
          <Har.Param>{
            name: entry.key,
            fileName: entry.key, // TODO: Blob doesn't contain file info, anyway to bring file name here ?
            contentType: entry.contentType
              ? entry.contentType
              : typeof file === "object" && file && "type" in file
                ? file.type
                : undefined,
          }
      )
    }

    if (entry.contentType) {
      return {
        name: entry.key,
        value: entry.value as string,
        fileName: entry.key,
        contentType: entry.contentType,
      }
    }

    return {
      name: entry.key,
      value: entry.value as string,
      contentType: entry.contentType,
    }
  })
}

/**
 * JSON MIME types that httpsnippet parses into a jsonObj internally.
 * When the parsed object contains special characters (newlines, tabs,
 * backslashes, etc.), some code generators fail to re-escape them,
 * producing syntactically broken generated code.
 *
 * @see https://github.com/hoppscotch/hoppscotch/issues/3011
 */
const JSON_MIME_TYPES: readonly string[] = [
  "application/json",
  "application/x-json",
  "text/json",
  "text/x-json",
]

/**
 * Recursively checks whether any string value in a parsed JSON structure
 * contains characters that httpsnippet's code generators fail to escape
 * (control characters like \n, \t, \r, etc. and backslashes).
 *
 * When such characters are present, httpsnippet's internal `literalRepresentation`
 * (Python), `convertType` (PHP), and similar helpers embed them literally into the
 * generated code, producing syntactically invalid output.
 */
const jsonHasProblematicChars = (text: string): boolean => {
  try {
    return hasProblematicValue(JSON.parse(text))
  } catch {
    // Not valid JSON — httpsnippet won't use the jsonObj path anyway
    return false
  }
}

const hasProblematicValue = (value: unknown): boolean => {
  if (typeof value === "string") {
    // Check for control characters (U+0000–U+001F, U+007F–U+009F) and backslashes
    // that literalRepresentation and similar helpers don't escape properly
    // eslint-disable-next-line no-control-regex
    return /[\x00-\x1f\x7f-\x9f\\]/.test(value)
  }
  if (Array.isArray(value)) {
    return value.some(hasProblematicValue)
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(hasProblematicValue)
  }
  return false
}

const buildHarPostData = (req: HoppRESTRequest): Har.PostData | undefined => {
  if (!req.body.contentType) return undefined

  if (
    objectFieldIncludes(req.body, "contentType", [
      "application/x-www-form-urlencoded",
      "multipart/form-data",
    ] as const)
  ) {
    return {
      mimeType: req.body.contentType, // By default assume JSON ?
      params: buildHarPostParams(req as any),
    }
  }

  const bodyText = (req.body.body as string) ?? ""

  // Workaround for httpsnippet special character escaping bug (#3011):
  // When a JSON body contains values with control characters (e.g. \n, \t) or
  // backslashes, httpsnippet internally parses the JSON into an object. Some code
  // generators then fail to re-escape these characters in the output, producing
  // syntactically broken code (e.g. literal newlines inside Python string literals).
  //
  // By setting the HAR mimeType to "text/plain" instead of the JSON type, we prevent
  // httpsnippet from parsing the body as JSON. This forces generators to use the raw
  // text code path, which properly handles escaping via JSON.stringify() or equivalent.
  // The actual Content-Type header is still preserved via buildHarHeaders().
  const isJsonMime = JSON_MIME_TYPES.includes(req.body.contentType!)
  const mimeType =
    isJsonMime && jsonHasProblematicChars(bodyText)
      ? "text/plain"
      : req.body.contentType!

  return {
    mimeType,
    text: bodyText,
  }
}

export const buildHarRequest = (
  req: HoppRESTRequest
): Har.Request & {
  postData: Har.PostData & Exclude<Har.PostData, undefined>
} => {
  return {
    bodySize: -1, // TODO: It would be cool if we can calculate the body size
    headersSize: -1, // TODO: It would be cool if we can calculate the header size
    httpVersion: "HTTP/1.1",
    cookies: [], // Hoppscotch does not have formal support for Cookies as of right now
    headers: buildHarHeaders(req),
    method: req.method,
    queryString: buildHarQueryStrings(req),
    url: req.endpoint,
    postData: buildHarPostData(req) ?? {
      mimeType: "x-unknown",
      params: [],
    },
  }
}
