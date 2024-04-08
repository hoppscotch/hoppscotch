import {
  Collection as PMCollection,
  Item,
  ItemGroup,
  QueryParam,
  RequestAuthDefinition,
  VariableDefinition,
  Variable,
} from "postman-collection"
import {
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTRequest,
  makeRESTRequest,
  HoppCollection,
  makeCollection,
  ValidContentTypes,
  knownContentTypes,
  FormDataKeyValue,
  HoppRESTRequestVariable,
} from "@hoppscotch/data"
import { pipe, flow } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { PMRawLanguage } from "~/types/pm-coll-exts"
import { stringArrayJoin } from "~/helpers/functional/array"

const safeParseJSON = (jsonStr: string) => O.tryCatch(() => JSON.parse(jsonStr))

const isPMItem = (x: unknown): x is Item => Item.isItem(x)

const replacePMVarTemplating = flow(
  S.replace(/{{\s*/g, "<<"),
  S.replace(/\s*}}/g, ">>")
)

const PMRawLanguageOptionsToContentTypeMap: Record<
  PMRawLanguage,
  ValidContentTypes
> = {
  text: "text/plain",
  javascript: "text/plain",
  json: "application/json",
  html: "text/html",
  xml: "application/xml",
}

const isPMItemGroup = (x: unknown): x is ItemGroup<Item> =>
  ItemGroup.isItemGroup(x)

const readPMCollection = (def: string) =>
  pipe(
    def,
    safeParseJSON,
    O.chain((data) =>
      O.tryCatch(() => {
        return new PMCollection(data)
      })
    )
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

const getHoppReqVariables = (item: Item) => {
  return pipe(
    item.request.url.variables.all(),
    A.filter(
      (variable): variable is Variable =>
        variable.key !== undefined &&
        variable.key !== null &&
        variable.key.length > 0
    ),
    A.map((variable) => {
      return <HoppRESTRequestVariable>{
        key: replacePMVarTemplating(variable.key ?? ""),
        value: replacePMVarTemplating(variable.value ?? ""),
        active: !variable.disabled,
      }
    })
  )
}

type PMRequestAuthDef<
  AuthType extends
    RequestAuthDefinition["type"] = RequestAuthDefinition["type"],
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
          ? "QUERY_PARAMS"
          : "HEADERS",
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
    const accessTokenURL = replacePMVarTemplating(
      getVariableValue(auth.oauth2, "accessTokenUrl") ?? ""
    )
    const authURL = replacePMVarTemplating(
      getVariableValue(auth.oauth2, "authUrl") ?? ""
    )
    const clientId = replacePMVarTemplating(
      getVariableValue(auth.oauth2, "clientId") ?? ""
    )
    const scope = replacePMVarTemplating(
      getVariableValue(auth.oauth2, "scope") ?? ""
    )
    const token = replacePMVarTemplating(
      getVariableValue(auth.oauth2, "accessToken") ?? ""
    )

    return {
      authType: "oauth-2",
      authActive: true,
      grantTypeInfo: {
        grantType: "AUTHORIZATION_CODE",
        authEndpoint: authURL,
        clientID: clientId,
        scopes: scope,
        token: token,
        tokenEndpoint: accessTokenURL,
        clientSecret: "",
        isPKCE: false,
      },
      addTo: "HEADERS",
    }
  }

  return { authType: "none", authActive: true }
}

const getHoppReqBody = (item: Item): HoppRESTReqBody => {
  if (!item.request.body) return { contentType: null, body: null }

  const body = item.request.body

  if (body.mode === "formdata") {
    return {
      contentType: "multipart/form-data",
      body: pipe(
        body.formdata?.all() ?? [],
        A.map(
          (param) =>
            <FormDataKeyValue>{
              key: replacePMVarTemplating(param.key),
              value: replacePMVarTemplating(
                param.type === "text" ? (param.value as string) : ""
              ),
              active: !param.disabled,
              isFile: false, // TODO: Preserve isFile state ?
            }
        )
      ),
    }
  } else if (body.mode === "urlencoded") {
    return {
      contentType: "application/x-www-form-urlencoded",
      body: pipe(
        body.urlencoded?.all() ?? [],
        A.map(
          (param) =>
            `${replacePMVarTemplating(
              param.key ?? ""
            )}: ${replacePMVarTemplating(param.value ?? "")}`
        ),
        stringArrayJoin("\n")
      ),
    }
  } else if (body.mode === "raw") {
    return pipe(
      O.Do,

      // Extract content-type
      O.bind("contentType", () =>
        pipe(
          // Get the info from the content-type header
          getHoppReqHeaders(item),
          A.findFirst(({ key }) => key.toLowerCase() === "content-type"),
          O.map((x) => x.value),

          // Make sure it is a content-type Hopp can work with
          O.filter(
            (contentType): contentType is ValidContentTypes =>
              contentType in knownContentTypes
          ),

          // Back-up plan, assume language from raw language defintion
          O.alt(() =>
            pipe(
              body.options?.raw?.language,
              O.fromNullable,
              O.map((lang) => PMRawLanguageOptionsToContentTypeMap[lang])
            )
          ),

          // If that too failed, just assume "text/plain"
          O.getOrElse((): ValidContentTypes => "text/plain"),

          O.of
        )
      ),

      // Extract and parse body
      O.bind("body", () =>
        pipe(body.raw, O.fromNullable, O.map(replacePMVarTemplating))
      ),

      // Return null content-type if failed, else return parsed
      O.match(
        () =>
          <HoppRESTReqBody>{
            contentType: null,
            body: null,
          },
        ({ contentType, body }) =>
          <HoppRESTReqBody>{
            contentType,
            body,
          }
      )
    )
  }

  // TODO: File
  // TODO: GraphQL ?

  return { contentType: null, body: null }
}

const getHoppReqURL = (item: Item): string =>
  pipe(
    item.request.url.toString(false),
    S.replace(/\?.+/g, ""),
    replacePMVarTemplating
  )

const getHoppRequest = (item: Item): HoppRESTRequest => {
  return makeRESTRequest({
    name: item.name,
    endpoint: getHoppReqURL(item),
    method: item.request.method.toUpperCase(),
    headers: getHoppReqHeaders(item),
    params: getHoppReqParams(item),
    auth: getHoppReqAuth(item),
    body: getHoppReqBody(item),
    requestVariables: getHoppReqVariables(item),

    // TODO: Decide about this
    preRequestScript: "",
    testScript: "",
  })
}

const getHoppFolder = (ig: ItemGroup<Item>): HoppCollection =>
  makeCollection({
    name: ig.name,
    folders: pipe(
      ig.items.all(),
      A.filter(isPMItemGroup),
      A.map(getHoppFolder)
    ),
    requests: pipe(ig.items.all(), A.filter(isPMItem), A.map(getHoppRequest)),
    auth: { authType: "inherit", authActive: true },
    headers: [],
  })

export const getHoppCollections = (collections: PMCollection[]) => {
  return collections.map(getHoppFolder)
}

export const hoppPostmanImporter = (fileContents: string[]) =>
  pipe(
    // Try reading
    fileContents,
    A.traverse(O.Applicative)(readPMCollection),

    O.map(flow(getHoppCollections)),

    TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )
