import { HoppRESTReqBody } from "@hoppscotch/data"
import { tryCatch, match, Option } from "fp-ts/Option"
import { pipe } from "fp-ts/function"

/**
 * Checks and Parses JSON string
 * @param str Raw JSON data to be parsed
 * @returns Option type with some(formatted JSON) or none
 */
// const safeParseJson = (str: string): Either<Error, unknown> =>
const isJSON = (str: string): Option<string> => {
  return tryCatch(() => {
    const tempBody = JSON.parse(str)
    return JSON.stringify(tempBody, null, 2)
  })
}

/**
 * Detects the content type of the input string
 * @param rawData String for which content type is to be detected
 * @returns Content type of the data
 */
export function detectContentType(
  rawData: string
): HoppRESTReqBody["contentType"] {
  let contentType: HoppRESTReqBody["contentType"] = "text/plain"

  if (isJSON(rawData)._tag === "Some") contentType = "application/json"
  else if (/([^&=]+)=([^&=]+)/.test(rawData)) {
    contentType = "application/x-www-form-urlencoded"
  } else {
    const boundaryMatch = rawData.match(/^-{2,}.+\\r\\n/)
    if (boundaryMatch && boundaryMatch.length > 0)
      contentType = "multipart/form-data"
  }

  return contentType
}

/**
 * Parses provided string according to the content type
 * @param rawData Data to be parsed
 * @param contentType Content type of the data
 * @param boundary Optional parameter required for multipart/form-data content type
 * @returns Parsed body as string or Record object for multipart/form-data or null for error
 */
// null for error in parsing
export function parseBody(
  rawData: string,
  contentType: HoppRESTReqBody["contentType"],
  rawContentType?: string
): string | null | Record<string, string> {
  let body: string | null = null
  const multipartBody: Record<string, string> = {}
  switch (contentType) {
    case "application/json": {
      pipe(
        isJSON(rawData),
        match(
          () => (body = "{}"),
          (parsedJSON) => (body = parsedJSON)
        )
      )
      break
    }
    case "application/x-www-form-urlencoded": {
      const pairs = rawData.match(/(([^&=]+)=?([^&=]+))/g)
      if (pairs && pairs.length > 0)
        body = pairs.map((p) => p.replace("=", ": ")).join("\n")
      break
    }
    case "multipart/form-data": {
      let boundary = ""
      if (!rawContentType) {
        const boundaryMatch = rawData.match(/^-{2,}.+\\r\\n/)
        if (boundaryMatch && boundaryMatch.length > 0)
          boundary = boundaryMatch[0]
        else break
      } else {
        const boundaryContentMatch = rawContentType.match(/boundary=(.+)/)
        if (boundaryContentMatch)
          boundary = "--" + boundaryContentMatch[0].split("=")[1]
        else break
      }

      // TODO: change to pipe
      const processedData = rawData
        .split(boundary)
        .filter((p) => p !== "" && p.includes("name"))
        .map((p) => p.replaceAll(/[\r\n]+/g, "\r\n"))
        .map((p) => p.split("\\r\\n"))
        .map((p) => p.filter((q) => q !== ""))

      for (const p of processedData) {
        const nameMatch = p[0].match(/name=(.+)$/)
        if (nameMatch && nameMatch.length > 0) {
          const name = nameMatch[0].replaceAll(/"/g, "").split("=")[1]
          multipartBody[name] = p[0].includes("filename") ? "" : p[1]
        }
      }

      break
    }
    case "application/hal+json":
    case "application/ld+json":
    case "application/vnd.api+json":
    case "application/xml":
    case "text/html":
    case "text/plain":
    default:
      body = rawData
  }
  return contentType === "multipart/form-data" ? multipartBody : body
}
