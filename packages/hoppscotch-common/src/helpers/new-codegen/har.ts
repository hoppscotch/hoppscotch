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

  // check if User-Agent exists in ALL headers (including inactive)
  const hasUserAgent = req.headers.some(
    (header) => header.key.toLowerCase() === "user-agent"
  )

  // Note: User-Agent is added for consistency across generators.
  // Browsers may ignore this header as it is restricted.
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

  // application/octet-stream bodies are File | null; emit @filename for file uploads
  if (req.body.contentType === "application/octet-stream") {
    const file = req.body.body

    if (!file) {
      return {
        mimeType: req.body.contentType,
        text: "",
      }
    }

    // `path` exists in some desktop runtimes; `name` is the standard File field.
    const filename =
      "path" in file && typeof file.path === "string" && file.path
        ? file.path
        : file.name || "<binary-file>"

    return {
      mimeType: req.body.contentType,
      text: `@${filename}`,
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
