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
  const activeHeaders = req.headers
    .filter((header) => header.active)
    .map((header) => ({
      name: header.key,
      value: header.value,
    }))

  // check if User-Agent already exists
  const hasUserAgent = activeHeaders.some(
    (header) => header.name.toLowerCase() === "user-agent"
  )

  // if not present, add a default one
  if (!hasUserAgent) {
    activeHeaders.push({
      name: "User-Agent",
      value: "Hoppscotch",
    })
  }

  return activeHeaders
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
  if (req.body.contentType === "application/x-www-form-urlencoded") {
    return pipe(
      req.body.body,
      S.split("\n"),
      RA.map(
        flow(
          splitHarQueryParams(":"), 
          RA.map(S.trim),
          ([key, value]) => ({
            name: key,
            value: value ?? "",
          })
        )
      ),
      RA.toArray
    )
  }

  return req.body.body.flatMap((entry) => {
    if (entry.isFile) {
      const values = Array.isArray(entry.value) ? entry.value : [entry.value]
      return values.map(
        (file) =>
          <Har.Param>{
            name: entry.key,
            fileName: entry.key,
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

const buildHarPostData = (req: HoppRESTRequest): Har.PostData | undefined => {
  if (!req.body.contentType) return undefined

  if (
    objectFieldIncludes(req.body, "contentType", [
      "application/x-www-form-urlencoded",
      "multipart/form-data",
    ] as const)
  ) {
    return {
      mimeType: req.body.contentType,
      params: buildHarPostParams(req as any),
    }
  }

  return {
    mimeType: req.body.contentType,
    text: (req.body.body as string) ?? "",
  }
}

export const buildHarRequest = (
  req: HoppRESTRequest
): Har.Request & {
  postData: Har.PostData & Exclude<Har.PostData, undefined>
} => {
  return {
    bodySize: -1,
    headersSize: -1,
    httpVersion: "HTTP/1.1",
    cookies: [],
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
