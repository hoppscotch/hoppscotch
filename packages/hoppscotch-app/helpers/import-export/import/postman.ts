import {
  Collection as PMCollection,
  FormParam,
  Item,
  ItemGroup,
  QueryParam,
  RequestAuthDefinition,
  VariableDefinition,
} from "postman-collection"
import {
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTRequest,
  makeRESTRequest,
} from "@hoppscotch/data"
import { pipe, flow } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."
import { Collection, makeCollection } from "~/newstore/collections"

const safeParseJSON = (jsonStr: string) => O.tryCatch(() => JSON.parse(jsonStr))

const isPMItem = (x: unknown): x is Item => Item.isItem(x)

const replacePMVarTemplating = flow(
  S.replace(/{{\s*/g, "<<"),
  S.replace(/\s*}}/g, ">>")
)

const isPMItemGroup = (x: unknown): x is ItemGroup<Item> =>
  ItemGroup.isItemGroup(x)

const readPMCollection = (def: string) =>
  pipe(
    def,
    safeParseJSON,
    O.chain((data) => O.tryCatch(() => new PMCollection(data)))
  )

const getHoppReqHeaders = (item: Item): HoppRESTHeader[] =>
  pipe(
    item.request.headers.all(),
    A.map((header) => {
      return <HoppRESTHeader>{
        key: replacePMVarTemplating(header.key),
        value: replacePMVarTemplating(header.value),
        active: !header.disabled,
      }
    })
  )

const getHoppReqParams = (item: Item): HoppRESTParam[] => {
  return pipe(
    item.request.url.query.all(),
    A.filter(
      (param): param is QueryParam & { key: string } =>
        param.key !== undefined && param.key !== null && param.key.length > 0
    ),
    A.map((param) => {
      return <HoppRESTHeader>{
        key: replacePMVarTemplating(param.key),
        value: replacePMVarTemplating(param.value ?? ""),
        active: !param.disabled,
      }
    })
  )
}

type PMRequestAuthDef<
  AuthType extends RequestAuthDefinition["type"] = RequestAuthDefinition["type"]
> = AuthType extends RequestAuthDefinition["type"] & string
  ? // eslint-disable-next-line no-unused-vars
    { type: AuthType } & { [x in AuthType]: VariableDefinition[] }
  : { type: AuthType }

const getVariableValue = (defs: VariableDefinition[], key: string) =>
  defs.find((param) => param.key === key)?.value as string | undefined

const getHoppReqAuth = (item: Item): HoppRESTAuth => {
  if (!item.request.auth) return { authType: "none", authActive: true }

  // Cast to the type for more stricter checking down the line
  const auth = item.request.auth as unknown as PMRequestAuthDef

  if (auth.type === "basic") {
    return {
      authType: "basic",
      authActive: true,
      username: replacePMVarTemplating(
        getVariableValue(auth.basic, "username") ?? ""
      ),
      password: replacePMVarTemplating(
        getVariableValue(auth.basic, "password") ?? ""
      ),
    }
  } else if (auth.type === "apikey") {
    return {
      authType: "api-key",
      authActive: true,
      key: replacePMVarTemplating(getVariableValue(auth.apikey, "key") ?? ""),
      value: replacePMVarTemplating(
        getVariableValue(auth.apikey, "value") ?? ""
      ),
      addTo:
        (getVariableValue(auth.apikey, "in") ?? "query") === "query"
          ? "Query params"
          : "Headers",
    }
  } else if (auth.type === "bearer") {
    return {
      authType: "bearer",
      authActive: true,
      token: replacePMVarTemplating(
        getVariableValue(auth.bearer, "token") ?? ""
      ),
    }
  } else if (auth.type === "oauth2") {
    return {
      authType: "oauth-2",
      authActive: true,
      accessTokenURL: replacePMVarTemplating(
        getVariableValue(auth.oauth2, "accessTokenUrl") ?? ""
      ),
      authURL: replacePMVarTemplating(
        getVariableValue(auth.oauth2, "authUrl") ?? ""
      ),
      clientID: replacePMVarTemplating(
        getVariableValue(auth.oauth2, "clientId") ?? ""
      ),
      scope: replacePMVarTemplating(
        getVariableValue(auth.oauth2, "scope") ?? ""
      ),
      token: replacePMVarTemplating(
        getVariableValue(auth.oauth2, "accessToken") ?? ""
      ),
      oidcDiscoveryURL: "",
    }
  }

  return { authType: "none", authActive: true }
}

type PMFormDataParamType = FormParam & {
  type: "file" | "text"
}

const getHoppReqBody = (item: Item): HoppRESTReqBody => {
  if (!item.request.body) return { contentType: null, body: null }

  // TODO: Implement
  const body = item.request.body

  if (body.mode === "formdata") {
    return {
      contentType: "multipart/form-data",
      body:
        (body.formdata?.all() as PMFormDataParamType[]).map((param) => ({
          key: replacePMVarTemplating(param.key),
          value: replacePMVarTemplating(
            param.type === "text" ? (param.value as string) : ""
          ),
          active: !param.disabled,
          isFile: false, // TODO: Preserve isFile state ?
        })) ?? [],
    }
  } else if (body.mode === "urlencoded") {
    return {
      contentType: "application/x-www-form-urlencoded",
      body:
        body.urlencoded
          ?.all()
          .map(
            (param) =>
              `${replacePMVarTemplating(
                param.key ?? ""
              )}: ${replacePMVarTemplating(param.value ?? "")}`
          )
          .join("\n") ?? "",
    }
  } else if (body.mode === "raw") {
    // Find content type from the content type header
    const contentType = getHoppReqHeaders(item).find(
      ({ key }) => key.toLowerCase() === "content-type"
    )?.value

    if (contentType && body.raw !== undefined && body.raw !== null)
      return {
        contentType: contentType as any,
        body: replacePMVarTemplating(body.raw),
      }
    else return { contentType: null, body: null } // TODO: Any sort of recovery ?
  }

  // TODO: File
  // TODO: GraphQL ?

  return { contentType: null, body: null }
}

const getHoppReqURL = (item: Item): string =>
  pipe(
    item.request.url.toString(true),
    S.replace(/\?.+/g, ""),
    replacePMVarTemplating
  )

const getHoppRequest = (item: Item): HoppRESTRequest => {
  return makeRESTRequest({
    name: item.name,
    endpoint: getHoppReqURL(item),
    method: item.request.method,
    headers: getHoppReqHeaders(item),
    params: getHoppReqParams(item),
    auth: getHoppReqAuth(item),
    body: getHoppReqBody(item),

    // TODO: Decide about this
    preRequestScript: "",
    testScript: "",
  })
}

const getHoppFolder = (ig: ItemGroup<Item>): Collection<HoppRESTRequest> =>
  makeCollection({
    name: ig.name,
    folders: pipe(
      ig.items.all(),
      A.filter(isPMItemGroup),
      A.map(getHoppFolder)
    ),
    requests: pipe(ig.items.all(), A.filter(isPMItem), A.map(getHoppRequest)),
  })

export const getHoppCollection = (coll: PMCollection) => getHoppFolder(coll)

export default defineImporter({
  name: "import.from_postman",
  icon: "postman",
  steps: [
    step({
      stepName: "FILE_IMPORT",
      metadata: {
        caption: "import.from_postman_description",
        acceptedFileTypes: ".json",
      },
    }),
  ] as const,
  importer: ([fileContent]) =>
    pipe(
      // Try reading
      fileContent,
      readPMCollection,

      O.map(flow(getHoppCollection, A.of)),

      TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
    ),
})
