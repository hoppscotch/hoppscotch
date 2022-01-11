import { HoppRESTRequest, translateToNewRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."
import { Collection, makeCollection } from "~/newstore/collections"

// TODO: I don't even know what is going on here :/
type PostmanCollection = {
  info?: {
    name: string
  }
  name: string
  item: {
    name: string
    request: any
    item?: any
  }[]
  folders?: any
}

const hasFolder = (item: { item?: any }) => {
  return Object.prototype.hasOwnProperty.call(item, "item")
}

export const parsePostmanCollection = ({
  info,
  name,
  item,
}: PostmanCollection) => {
  const hoppscotchCollection: Collection<HoppRESTRequest> = makeCollection({
    name: "",
    folders: [],
    requests: [],
  })

  hoppscotchCollection.name = info ? info.name : name

  if (item && item.length > 0) {
    for (const collectionItem of item) {
      if (collectionItem.request) {
        if (
          Object.prototype.hasOwnProperty.call(hoppscotchCollection, "folders")
        ) {
          hoppscotchCollection.name = info ? info.name : name
          hoppscotchCollection.requests.push(
            parsePostmanRequest(collectionItem)
          )
        } else {
          hoppscotchCollection.name = name || ""
          hoppscotchCollection.requests.push(
            parsePostmanRequest(collectionItem)
          )
        }
      } else if (hasFolder(collectionItem)) {
        hoppscotchCollection.folders.push(
          parsePostmanCollection(collectionItem as any)
        )
      } else {
        hoppscotchCollection.requests.push(parsePostmanRequest(collectionItem))
      }
    }
  }
  return hoppscotchCollection
}

// TODO: Rewrite
const parsePostmanRequest = ({
  name,
  request,
}: {
  name: string
  request: any
}) => {
  const pwRequest = {
    url: "",
    path: "",
    method: "",
    auth: "",
    httpUser: "",
    httpPassword: "",
    passwordFieldType: "password",
    bearerToken: "",
    headers: [] as { name?: string; type?: string }[],
    params: [] as { disabled?: boolean }[],
    bodyParams: [] as { type?: string }[],
    body: {
      body: "",
      contentType: "application/json",
    },
    rawParams: "",
    rawInput: false,
    contentType: "",
    requestType: "",
    name: "",
  }

  pwRequest.name = name
  if (request.url) {
    const requestObjectUrl = request.url.raw.match(
      /^(.+:\/\/[^/]+|{[^/]+})(\/[^?]+|).*$/
    )
    if (requestObjectUrl) {
      pwRequest.url = requestObjectUrl[1]
      pwRequest.path = requestObjectUrl[2] ? requestObjectUrl[2] : ""
    } else {
      pwRequest.url = request.url.raw
    }
  }

  pwRequest.method = request.method
  const itemAuth = request.auth ? request.auth : ""
  const authType = itemAuth ? itemAuth.type : ""

  try {
    if (authType === "basic") {
      pwRequest.auth = "Basic Auth"
      pwRequest.httpUser =
        itemAuth.basic[0].key === "username"
          ? itemAuth.basic[0].value
          : itemAuth.basic[1].value
      pwRequest.httpPassword =
        itemAuth.basic[0].key === "password"
          ? itemAuth.basic[0].value
          : itemAuth.basic[1].value
    } else if (authType === "oauth2") {
      pwRequest.auth = "OAuth 2.0"
      pwRequest.bearerToken =
        itemAuth.oauth2[0].key === "accessToken"
          ? itemAuth.oauth2[0].value
          : itemAuth.oauth2[1].value
    } else if (authType === "bearer") {
      pwRequest.auth = "Bearer Token"
      pwRequest.bearerToken = itemAuth.bearer[0].value
    }
  } catch (error) {
    console.error(error)
  }

  const requestObjectHeaders = request.header
  if (requestObjectHeaders) {
    pwRequest.headers = requestObjectHeaders
    for (const header of pwRequest.headers) {
      delete header.name
      delete header.type
    }
  }
  if (request.url) {
    const requestObjectParams = request.url.query
    if (requestObjectParams) {
      pwRequest.params = requestObjectParams
      for (const param of pwRequest.params) {
        delete param.disabled
      }
    }
  }
  if (request.body) {
    if (request.body.mode === "urlencoded") {
      const params = request.body.urlencoded
      pwRequest.bodyParams = params || []
      for (const param of pwRequest.bodyParams) {
        delete param.type
      }
    } else if (request.body.mode === "raw") {
      pwRequest.rawInput = true
      pwRequest.rawParams = request.body.raw
      try {
        const body = JSON.parse(request.body.raw)
        pwRequest.body.body = JSON.stringify(body, null, 2)
      } catch (error) {
        console.error(error)
      }
    }
  }
  return translateToNewRequest(pwRequest)
}

const safeParseJSON = (str: string) => O.tryCatch(() => JSON.parse(str))

export default defineImporter({
  name: "Postman Collection",
  icon: "postman",
  steps: [
    step({
      stepName: "FILE_IMPORT",
      metadata: {
        acceptedFileTypes: ".json",
      },
    }),
  ] as const,
  importer: ([fileContent]) =>
    pipe(
      // Parse to JSON
      fileContent,
      safeParseJSON,

      // Parse To Postman Collection
      O.chain((data) => O.tryCatch(() => parsePostmanCollection(data))),

      // Convert Option to Task Either
      TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
    ),
})
