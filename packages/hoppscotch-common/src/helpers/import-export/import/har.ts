import {
  HoppCollection,
  HoppRESTHeader,
  HoppRESTParam,
  ValidContentTypesList,
  ValidContentTypes,
  HoppRESTReqBody,
  HoppRESTReqBodyFormData,
  HoppRESTRequest,
  getDefaultRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { z } from "zod"

export const harImporter = (
  content: string[]
): E.Either<"INVALID_HAR" | "SOMETHING_WENT_WRONG", HoppCollection[]> => {
  try {
    const harObject = JSON.parse(content[0])
    const res = harSchema.safeParse(harObject)

    if (!res.success) {
      return E.left("INVALID_HAR")
    }

    const har = res.data

    const requests = harToHoppscotchRequestConverter(har)

    const collection = makeCollection({
      name: "Imported from HAR",
      folders: [],
      requests: requests,
      auth: {
        authType: "none",
        authActive: true,
      },
      headers: [],
    })

    return E.right([collection])
  } catch (error) {
    console.error(error)
    return E.left("SOMETHING_WENT_WRONG")
  }
}

const harToHoppscotchRequestConverter = (har: HAR) => {
  return har.log.entries.map((entry): HoppRESTRequest => {
    const headers = entry.request.headers.map((header): HoppRESTHeader => {
      return {
        active: true,
        key: header.name,
        value: header.value,
        description: "",
      }
    })

    const params = entry.request.queryString.map((param): HoppRESTParam => {
      return {
        active: true,
        key: param.name,
        value: param.value,
        description: "",
      }
    })

    const body = entry.request.postData
      ? convertPostDataToHoppBody(entry.request.postData)
      : { body: null, contentType: null }

    const { method, url } = entry.request

    const parsedUrl = new URL(url)
    const urlWithoutQueryParams = parsedUrl.origin + parsedUrl.pathname

    return {
      ...getDefaultRESTRequest(),
      endpoint: urlWithoutQueryParams,
      params,
      body,
      headers,
      method,
      name: url,
    }
  })
}

const convertPostDataToHoppBody = (
  postData: z.infer<typeof postDataSchema>
): HoppRESTReqBody => {
  let contentType: ValidContentTypes = "text/plain"

  if (isValidContentType(postData.mimeType)) {
    contentType = postData.mimeType
  } else if (postData.mimeType.startsWith("multipart/form-data")) {
    // some har files will have formdata formatted like multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
    contentType = "multipart/form-data"
  }

  // all the contentTypes except application/x-www-form-urlencoded && multipart/form-data will have text content
  if (
    contentType === "application/json" ||
    contentType === "application/hal+json" ||
    contentType === "application/ld+json" ||
    contentType === "application/vnd.api+json" ||
    contentType === "application/xml" ||
    contentType === "text/html" ||
    contentType === "text/xml" ||
    contentType === "text/plain"
  ) {
    const body: HoppRESTReqBody = {
      body: postData.text ?? "",
      contentType,
    }

    return body
  }

  if (contentType === "application/x-www-form-urlencoded") {
    let bodyContent: string = ""

    if (postData.text) {
      bodyContent = formatXWWWFormUrlencodedForHoppscotch(postData.text)
    } else if (postData.params) {
      bodyContent = postData.params
        .map((param) => {
          return `${param.name}:${param.value}`
        })
        .join("\n")
    }

    const body: HoppRESTReqBody = {
      contentType: "application/x-www-form-urlencoded",
      body: bodyContent,
    }

    return body
  }

  if (contentType === "multipart/form-data") {
    const body: HoppRESTReqBodyFormData = {
      contentType: "multipart/form-data",
      body:
        postData.params?.map((param) => {
          return param.fileName
            ? {
                active: true,
                isFile: true as const,
                key: param.name,
                value: [],
              }
            : {
                active: true,
                isFile: false as const,
                key: param.name,
                value: param.value ?? "",
              }
        }) ?? [],
    }

    return body
  }

  return {
    body: "",
    contentType,
  }
}

const isValidContentType = (
  contentType: string
): contentType is ValidContentTypes =>
  (ValidContentTypesList as string[]).includes(contentType)

const formatXWWWFormUrlencodedForHoppscotch = (text: string) => {
  const params = new URLSearchParams(text)
  const result = []

  for (const [key, value] of params) {
    result.push(`${key}:${value}`)
  }

  return result.join("\n")
}

// <------har zod schema defs------>
// we only define parts of the schema that we need

const recordSchema = z.object({
  name: z.string(),
  value: z.string(),
  comment: z.string().optional(),
})

const cookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  path: z.string().optional(),
  domain: z.string().optional(),
  expires: z.string().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  comment: z.string().optional(),
})

const postDataSchema = z.object({
  mimeType: z.string(),
  text: z.string().optional(),
  params: z
    .array(
      z.object({
        name: z.string(),
        value: z.string().optional(),
        fileName: z.string().optional(),
        contentType: z.string().optional(),
        comment: z.string().optional(),
      })
    )
    .optional(),
  comment: z.string().optional(),
})

const requestSchema = z.object({
  method: z.string(),
  url: z.string(),
  httpVersion: z.string(),
  cookies: z.array(cookieSchema),
  headers: z.array(recordSchema),
  queryString: z.array(recordSchema),
  postData: postDataSchema.optional(),
  headersSize: z.number().int(),
  bodySize: z.number().int(),
  comment: z.string().optional(),
})

const entrySchema = z.object({
  request: requestSchema,
})

const logSchema = z.object({
  entries: z.array(entrySchema),
})

const harSchema = z.object({
  log: logSchema,
})

type HAR = z.infer<typeof harSchema>
