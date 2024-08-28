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
      name: "Har Importer Collection",
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

    return {
      ...getDefaultRESTRequest(),
      endpoint: entry.request.url,
      params,
      body,
      headers,
      method: entry.request.method,
      name: entry.request.url,
    }
  })
}

const convertPostDataToHoppBody = (
  postData: z.infer<typeof postDataSchema>
): HoppRESTReqBody => {
  let contentType: ValidContentTypes = "text/plain"

  if (isValidContentType(postData.mimeType)) {
    contentType = postData.mimeType
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
    contentType === "text/plain" ||
    contentType === "application/x-www-form-urlencoded"
  ) {
    const body: HoppRESTReqBody = {
      body: postData.text ?? "",
      contentType,
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

// Helper schemas
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
  comment: z.string().optional(),
})

export const harSchema = z.object({
  log: logSchema,
})

export type HAR = z.infer<typeof harSchema>
