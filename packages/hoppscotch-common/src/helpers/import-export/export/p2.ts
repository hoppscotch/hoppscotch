import {
  HoppCollection,
  HoppRESTRequest,
  parseRawKeyValueEntriesE,
} from "@hoppscotch/data"
import {
  Collection,
  Item,
  ItemGroup,
  RequestAuthDefinition,
  RequestBodyDefinition,
} from "postman-collection"
import {
  HoppRESTReqBody,
  HoppRESTRequest,
  HoppCollection,
} from "@hoppscotch/data"

// import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { isLeft } from "fp-ts/lib/Either"

const hoppToPostmanTemplating = (input: string): string =>
  input.replace(/<<\s*/g, "{{").replace(/>>\s*/g, "}}")

const getAuth = (request: HoppRESTRequest): RequestAuthDefinition => {
  if (request.auth.authType === "basic") {
    return {
      type: "basic",
      basic: [
        {
          key: "username",
          value: hoppToPostmanTemplating(request.auth.username),
        },
        {
          key: "password",
          value: hoppToPostmanTemplating(request.auth.password),
        },
      ],
    }
  } else if (request.auth.authType === "api-key") {
    return {
      type: "apikey",
      apikey: [
        { key: "key", value: hoppToPostmanTemplating(request.auth.key) },
        { key: "value", value: hoppToPostmanTemplating(request.auth.value) },
        {
          key: "in",
          value: request.auth.addTo === "Query params" ? "query" : "header",
        },
      ],
    }
  } else if (request.auth.authType === "bearer") {
    return {
      type: "bearer",
      bearer: [
        { key: "token", value: hoppToPostmanTemplating(request.auth.token) },
      ],
    }
  } else if (request.auth.authType === "oauth-2") {
    return {
      type: "oauth2",
      oauth2: [
        {
          key: "accessTokenUrl",
          value: hoppToPostmanTemplating(request.auth.accessTokenURL),
        },
        {
          key: "authUrl",
          value: hoppToPostmanTemplating(request.auth.authURL),
        },
        {
          key: "clientId",
          value: hoppToPostmanTemplating(request.auth.clientID),
        },
        { key: "scope", value: hoppToPostmanTemplating(request.auth.scope) },
        {
          key: "accessToken",
          value: hoppToPostmanTemplating(request.auth.token),
        },
      ],
    }
  } else {
    return { type: "noauth" }
  }
}

const getBody = (
  hoppBody: HoppRESTReqBody
): RequestBodyDefinition | undefined => {
  if (hoppBody.contentType === null) {
    return undefined
  } else if (hoppBody.contentType === "multipart/form-data") {
    return {
      mode: "formdata",
      formdata: hoppBody.body.map((kv) => ({
        key: hoppToPostmanTemplating(kv.key),
        // kv.value can also be Blob[] and we aren't storing it
        value:
          typeof kv.value === "string" ? hoppToPostmanTemplating(kv.value) : "",
      })),
    }
  } else if (hoppBody.contentType === "application/x-www-form-urlencoded") {
    const maybeBody = parseRawKeyValueEntriesE(hoppBody.body)
    if (isLeft(maybeBody)) {
      return undefined
    }
    return {
      mode: "urlencoded",
      urlencoded: maybeBody.right.map((kv) => ({
        key: hoppToPostmanTemplating(kv.key),
        value: hoppToPostmanTemplating(kv.value),
      })),
    }
  } else {
    return { mode: "raw", raw: hoppBody.body }
  }
}

const getHeaders = (
  request: HoppRESTRequest
): { key: string; value: string }[] => {
  let out = []
  for (const header of request.headers) {
    out.push({ key: header.key, value: hoppToPostmanTemplating(header.value) })
  }

  if (
    request.body.contentType !== null &&
    request.body.contentType !== "multipart/form-data"
  ) {
    out = out.filter((header) => header.key.toLowerCase() !== "content-type")
    out.push({ key: "Content-Type", value: request.body.contentType })
  }

  return out
}

const parseStuff = (
  hoppCollection: HoppCollection<HoppRESTRequest>
): ItemGroup<Item> => {
  const postmanItemGoup = new ItemGroup<Item>()
  postmanItemGoup.name = hoppCollection.name
  for (const folder of hoppCollection.folders) {
    console.log("adding folder", JSON.parse(JSON.stringify(folder)))
    postmanItemGoup.items.add(parseStuff(folder))
  }
  for (const request of hoppCollection.requests) {
    const url = new URL(request.endpoint)
    const postmanRequest = new Item({
      request: {
        url: {
          hash: url.hash,
          host: url.host,
          path: hoppToPostmanTemplating(url.pathname),
          // Postman tends to parse a "" value as host:/path instead of host/path
          port: url.port === "" ? undefined : url.port,
          // Todo we are not caring about the active status
          query: request.params.map((param) => ({
            key: hoppToPostmanTemplating(param.key),
            value: hoppToPostmanTemplating(param.value),
          })),
          protocol: url.protocol.replace(":", ""), // Got a value like https:
        },
        method: request.method,
        // Todo we are not caring about the active status of header
        header: getHeaders(request),
        body: getBody(request.body),
        auth: getAuth(request),
      },
    })
    postmanRequest.name = request.name

    postmanItemGoup.items.add(postmanRequest)
  }

  return postmanItemGoup
}

export const exportMyCollectionToPostmanCollection = (
  collection: HoppCollection<HoppRESTRequest>
): string => {
  const out = new Collection()
  out.name = collection.name
  parseStuff(collection).items.each((stuff) => out.items.add(stuff))
  return JSON.stringify(out.toJSON())
}

// This is a work in progress since both classes have different shapes

// export const exportTeamCollectionToPostmanCollection = (
//   collection: TeamCollection
// ): string => {
//   // debugger
//   const out = new Collection()
//   out.name = collection.title
//   // for(const stuff of parseStuff(collection).items.each) {
//   //     out.items.add(stuff)
//   // }
//   parseStuff(collection).items.each((stuff) => out.items.add(stuff))
//   // const out = parseStuff(collection)
//   return JSON.stringify(out.toJSON())
// }
