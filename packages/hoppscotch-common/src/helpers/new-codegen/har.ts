import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import { pipe } from "fp-ts/function"
import * as Har from "har-format"
import { HoppRESTRequest, parseRawKeyValueEntriesE } from "@hoppscotch/data"
import { FieldEquals, objectFieldIncludes } from "../typeutils"

// Hoppscotch support HAR Spec 1.2
// For more info on the spec: http://www.softwareishard.com/blog/har-12-spec/

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
  // URL Encoded bodies are stored in the raw key-value format: values may be
  // quoted and disabled pairs are kept as commented (`# key: value`) lines
  if (req.body.contentType === "application/x-www-form-urlencoded") {
    return pipe(
      parseRawKeyValueEntriesE(req.body.body),
      E.map(
        RA.filterMap(({ key, value, active }) =>
          // Skip disabled pairs and pairs without a key, like the request sender
          active && key !== "" ? O.some({ name: key, value }) : O.none
        )
      ),
      E.map(RA.toArray),
      E.getOrElse((): Har.Param[] => [])
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
    mimeType: req.body.contentType, // Let's assume by default content type is JSON
    text: (req.body.body as string) ?? "",
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
