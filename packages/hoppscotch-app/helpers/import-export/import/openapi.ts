import {
  OpenAPI,
  OpenAPIV2,
  OpenAPIV3,
  OpenAPIV3_1 as OpenAPIV31,
} from "openapi-types"
import SwaggerParser from "@apidevtools/swagger-parser"
import yaml from "js-yaml"
import {
  FormDataKeyValue,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTRequest,
  knownContentTypes,
  makeRESTRequest,
  HoppCollection,
  makeCollection,
} from "@hoppscotch/data"
import { pipe, flow } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as S from "fp-ts/string"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import * as RA from "fp-ts/ReadonlyArray"
import { step } from "../steps"
import { defineImporter, IMPORTER_INVALID_FILE_FORMAT } from "."

export const OPENAPI_DEREF_ERROR = "openapi/deref_error" as const

// TODO: URL Import Support

const safeParseJSON = (str: string) => O.tryCatch(() => JSON.parse(str))

const safeParseYAML = (str: string) => O.tryCatch(() => yaml.load(str))

const objectHasProperty = <T extends string>(
  obj: unknown,
  propName: T
  // eslint-disable-next-line
): obj is { [propName in T]: unknown } =>
  !!obj &&
  typeof obj === "object" &&
  Object.prototype.hasOwnProperty.call(obj, propName)

type OpenAPIPathInfoType =
  | OpenAPIV2.PathItemObject<{}>
  | OpenAPIV3.PathItemObject<{}>
  | OpenAPIV31.PathItemObject<{}>

type OpenAPIParamsType =
  | OpenAPIV2.ParameterObject
  | OpenAPIV3.ParameterObject
  | OpenAPIV31.ParameterObject

type OpenAPIOperationType =
  | OpenAPIV2.OperationObject
  | OpenAPIV3.OperationObject
  | OpenAPIV31.OperationObject

// Removes the OpenAPI Path Templating to the Hoppscotch Templating (<< ? >>)
const replaceOpenApiPathTemplating = flow(
  S.replace(/{/g, "<<"),
  S.replace(/}/g, ">>")
)

const parseOpenAPIParams = (params: OpenAPIParamsType[]): HoppRESTParam[] =>
  pipe(
    params,

    A.filterMap(
      flow(
        O.fromPredicate((param) => param.in === "query"),
        O.map(
          (param) =>
            <HoppRESTParam>{
              key: param.name,
              value: "", // TODO: Can we do anything more ? (parse default values maybe)
              active: true,
            }
        )
      )
    )
  )

const parseOpenAPIHeaders = (params: OpenAPIParamsType[]): HoppRESTHeader[] =>
  pipe(
    params,

    A.filterMap(
      flow(
        O.fromPredicate((param) => param.in === "header"),
        O.map(
          (header) =>
            <HoppRESTParam>{
              key: header.name,
              value: "", // TODO: Can we do anything more ? (parse default values maybe)
              active: true,
            }
        )
      )
    )
  )

const parseOpenAPIV2Body = (op: OpenAPIV2.OperationObject): HoppRESTReqBody => {
  const obj = (op.consumes ?? [])[0] as string | undefined

  // Not a content-type Hoppscotch supports
  if (!obj || !(obj in knownContentTypes))
    return { contentType: null, body: null }

  // Textual Content Types, so we just parse it and keep
  if (
    obj !== "multipart/form-data" &&
    obj !== "application/x-www-form-urlencoded"
  ) {
    return {
      contentType: obj as any,
      body: generateRequestBodyExampleFromOpenAPIV2Body(op),
    }
  }

  const formDataValues = pipe(
    (op.parameters ?? []) as OpenAPIV2.Parameter[],

    A.filterMap(
      flow(
        O.fromPredicate((param) => param.in === "body"),
        O.map(
          (param) =>
            <FormDataKeyValue>{
              key: param.name,
              isFile: false,
              value: "",
              active: true,
            }
        )
      )
    )
  )

  return obj === "application/x-www-form-urlencoded"
    ? {
        contentType: obj,
        body: formDataValues.map(({ key }) => `${key}: `).join("\n"),
      }
    : { contentType: obj, body: formDataValues }
}

const parseOpenAPIV3BodyFormData = (
  contentType: "multipart/form-data" | "application/x-www-form-urlencoded",
  mediaObj: OpenAPIV3.MediaTypeObject | OpenAPIV31.MediaTypeObject
): HoppRESTReqBody => {
  const schema = mediaObj.schema as
    | OpenAPIV3.SchemaObject
    | OpenAPIV31.SchemaObject
    | undefined

  if (!schema || schema.type !== "object") {
    return contentType === "application/x-www-form-urlencoded"
      ? { contentType, body: "" }
      : { contentType, body: [] }
  }

  const keys = Object.keys(schema.properties ?? {})

  if (contentType === "application/x-www-form-urlencoded") {
    return {
      contentType,
      body: keys.map((key) => `${key}: `).join("\n"),
    }
  } else {
    return {
      contentType,
      body: keys.map(
        (key) =>
          <FormDataKeyValue>{ key, value: "", isFile: false, active: true }
      ),
    }
  }
}

type PrimitiveSchemaType = "string" | "integer" | "number" | "boolean"

type SchemaType = "array" | "object" | PrimitiveSchemaType

type PrimitiveRequestBodyExampleType = number | string | boolean

type RequestBodyExampleType =
  | { [name: string]: RequestBodyExampleType }
  | Array<RequestBodyExampleType>
  | PrimitiveRequestBodyExampleType

const getPrimitiveTypePlaceholder = (
  schemaType: PrimitiveSchemaType
): PrimitiveRequestBodyExampleType => {
  switch (schemaType) {
    case "string":
      return "string"
    case "integer":
    case "number":
      return 1
    case "boolean":
      return true
  }
}

const getSchemaTypeFromSchemaObject = (
  schema: OpenAPIV2.SchemaObject
): O.Option<SchemaType> =>
  pipe(
    schema.type,
    O.fromNullable,
    O.map(
      (schemaType) =>
        (Array.isArray(schemaType) ? schemaType[0] : schemaType) as SchemaType
    )
  )

const isSchemaTypePrimitive = (
  schemaType: string
): schemaType is PrimitiveSchemaType =>
  ["string", "integer", "number", "boolean"].includes(schemaType)

const isSchemaTypeArray = (schemaType: string): schemaType is "array" =>
  schemaType === "array"

const isSchemaTypeObject = (schemaType: string): schemaType is "object" =>
  schemaType === "object"

const getSampleEnumValueOrPlaceholder = (
  schema: OpenAPIV2.SchemaObject
): RequestBodyExampleType => {
  const enumValue = pipe(
    schema.enum,
    O.fromNullable,
    O.map((enums) => enums[0] as RequestBodyExampleType)
  )

  if (O.isSome(enumValue)) return enumValue.value

  return pipe(
    schema,
    getSchemaTypeFromSchemaObject,
    O.filter(isSchemaTypePrimitive),
    O.map(getPrimitiveTypePlaceholder),
    O.getOrElseW(() => "")
  )
}

const generateExampleArrayFromOpenAPIV2ItemsObject = (
  items: OpenAPIV2.ItemsObject
): RequestBodyExampleType => {
  // ItemsObject can not hold type "object"
  // https://swagger.io/specification/v2/#itemsObject

  // TODO : Handle array of objects
  // https://stackoverflow.com/questions/60490974/how-to-define-an-array-of-objects-in-openapi-2-0

  const primitivePlaceholder = pipe(
    items,
    O.fromPredicate(
      flow((items) => items.type as SchemaType, isSchemaTypePrimitive)
    ),
    O.map(getSampleEnumValueOrPlaceholder)
  )

  if (O.isSome(primitivePlaceholder))
    return Array.of(primitivePlaceholder.value, primitivePlaceholder.value)

  // If the type is not primitive, it is "array"
  // items property is required if type is array
  return Array.of(
    generateExampleArrayFromOpenAPIV2ItemsObject(
      items.items as OpenAPIV2.ItemsObject
    )
  )
}

const generateRequestBodyExampleFromOpenAPIV2BodySchema = (
  schema: OpenAPIV2.SchemaObject
): RequestBodyExampleType => {
  if (schema.example) return schema.example as RequestBodyExampleType

  const primitiveTypeExample = pipe(
    schema,
    O.fromPredicate(
      flow(
        getSchemaTypeFromSchemaObject,
        O.map(isSchemaTypePrimitive),
        O.getOrElseW(() => false) // No schema type found in the schema object, assume non-primitive
      )
    ),
    O.map(getSampleEnumValueOrPlaceholder) // Use enum or placeholder to populate primitive field
  )

  if (O.isSome(primitiveTypeExample)) return primitiveTypeExample.value

  const arrayTypeExample = pipe(
    schema,
    O.fromPredicate(
      flow(
        getSchemaTypeFromSchemaObject,
        O.map(isSchemaTypeArray),
        O.getOrElseW(() => false) // No schema type found in the schema object, assume type to be different from array
      )
    ),
    O.map((schema) => schema.items as OpenAPIV2.ItemsObject),
    O.map(generateExampleArrayFromOpenAPIV2ItemsObject)
  )

  if (O.isSome(arrayTypeExample)) return arrayTypeExample.value

  return pipe(
    schema,
    O.fromPredicate(
      flow(
        getSchemaTypeFromSchemaObject,
        O.map(isSchemaTypeObject),
        O.getOrElseW(() => false)
      )
    ),
    O.chain((schema) =>
      pipe(
        schema.properties,
        O.fromNullable,
        O.map(
          (properties) =>
            Object.entries(properties) as [string, OpenAPIV2.SchemaObject][]
        )
      )
    ),
    O.getOrElseW(() => [] as [string, OpenAPIV2.SchemaObject][]),
    A.reduce(
      {} as { [name: string]: RequestBodyExampleType },
      (aggregatedExample, property) => {
        const example = generateRequestBodyExampleFromOpenAPIV2BodySchema(
          property[1]
        )
        aggregatedExample[property[0]] = example
        return aggregatedExample
      }
    )
  )
}

const getSchemaFromOpenAPIV2Parameter = (
  parameter: OpenAPIV2.Parameter
): OpenAPIV2.SchemaObject => parameter.schema

const generateRequestBodyExampleFromOpenAPIV2Body = (
  op: OpenAPIV2.OperationObject
): string =>
  pipe(
    (op.parameters ?? []) as OpenAPIV2.Parameter[],
    A.findFirst((param) => param.in === "body"),
    O.map(
      flow(
        getSchemaFromOpenAPIV2Parameter,
        generateRequestBodyExampleFromOpenAPIV2BodySchema
      )
    ),
    O.getOrElse(() => "" as RequestBodyExampleType),
    (requestBodyExample) => JSON.stringify(requestBodyExample, null, "\t") // Using a tab character mimics standard pretty-print appearance
  )

const parseOpenAPIV3Body = (
  op: OpenAPIV3.OperationObject | OpenAPIV31.OperationObject
): HoppRESTReqBody => {
  const objs = Object.entries(
    (
      op.requestBody as
        | OpenAPIV3.RequestBodyObject
        | OpenAPIV31.RequestBodyObject
        | undefined
    )?.content ?? {}
  )

  if (objs.length === 0) return { contentType: null, body: null }

  // We only take the first definition
  const [contentType, media]: [
    string,
    OpenAPIV3.MediaTypeObject | OpenAPIV31.MediaTypeObject
  ] = objs[0]

  return contentType in knownContentTypes
    ? contentType === "multipart/form-data" ||
      contentType === "application/x-www-form-urlencoded"
      ? parseOpenAPIV3BodyFormData(contentType, media)
      : { contentType: contentType as any, body: "" }
    : { contentType: null, body: null }
}

const isOpenAPIV3Operation = (
  doc: OpenAPI.Document,
  op: OpenAPIOperationType
): op is OpenAPIV3.OperationObject | OpenAPIV31.OperationObject =>
  objectHasProperty(doc, "openapi") &&
  typeof doc.openapi === "string" &&
  doc.openapi.startsWith("3.")

const parseOpenAPIBody = (
  doc: OpenAPI.Document,
  op: OpenAPIOperationType
): HoppRESTReqBody =>
  isOpenAPIV3Operation(doc, op)
    ? parseOpenAPIV3Body(op)
    : parseOpenAPIV2Body(op)

const resolveOpenAPIV3SecurityObj = (
  scheme: OpenAPIV3.SecuritySchemeObject | OpenAPIV31.SecuritySchemeObject,
  _schemeData: string[] // Used for OAuth to pass params
): HoppRESTAuth => {
  if (scheme.type === "http") {
    if (scheme.scheme === "basic") {
      // Basic
      return { authType: "basic", authActive: true, username: "", password: "" }
    } else if (scheme.scheme === "bearer") {
      // Bearer
      return { authType: "bearer", authActive: true, token: "" }
    } else {
      // Unknown/Unsupported Scheme
      return { authType: "none", authActive: true }
    }
  } else if (scheme.type === "apiKey") {
    if (scheme.in === "header") {
      return {
        authType: "api-key",
        authActive: true,
        addTo: "Headers",
        key: scheme.name,
        value: "",
      }
    } else if (scheme.in === "query") {
      return {
        authType: "api-key",
        authActive: true,
        addTo: "Query params",
        key: scheme.in,
        value: "",
      }
    }
  } else if (scheme.type === "oauth2") {
    // NOTE: We select flow on a first come basis on this order, authorizationCode > implicit > password > clientCredentials
    if (scheme.flows.authorizationCode) {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: scheme.flows.authorizationCode.tokenUrl ?? "",
        authURL: scheme.flows.authorizationCode.authorizationUrl ?? "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else if (scheme.flows.implicit) {
      return {
        authType: "oauth-2",
        authActive: true,
        authURL: scheme.flows.implicit.authorizationUrl ?? "",
        accessTokenURL: "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else if (scheme.flows.password) {
      return {
        authType: "oauth-2",
        authActive: true,
        authURL: "",
        accessTokenURL: scheme.flows.password.tokenUrl ?? "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else if (scheme.flows.clientCredentials) {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: scheme.flows.clientCredentials.tokenUrl ?? "",
        authURL: "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: "",
        authURL: "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    }
  } else if (scheme.type === "openIdConnect") {
    return {
      authType: "oauth-2",
      authActive: true,
      accessTokenURL: "",
      authURL: "",
      clientID: "",
      oidcDiscoveryURL: scheme.openIdConnectUrl ?? "",
      scope: _schemeData.join(" "),
      token: "",
    }
  }

  return { authType: "none", authActive: true }
}

const resolveOpenAPIV3SecurityScheme = (
  doc: OpenAPIV3.Document | OpenAPIV31.Document,
  schemeName: string,
  schemeData: string[]
): HoppRESTAuth => {
  const scheme = doc.components?.securitySchemes?.[schemeName] as
    | OpenAPIV3.SecuritySchemeObject
    | undefined

  if (!scheme) return { authType: "none", authActive: true }
  else return resolveOpenAPIV3SecurityObj(scheme, schemeData)
}

const resolveOpenAPIV3Security = (
  doc: OpenAPIV3.Document | OpenAPIV31.Document,
  security:
    | OpenAPIV3.SecurityRequirementObject[]
    | OpenAPIV31.SecurityRequirementObject[]
): HoppRESTAuth => {
  // NOTE: Hoppscotch only considers the first security requirement
  const sec = security[0] as OpenAPIV3.SecurityRequirementObject | undefined

  if (!sec) return { authType: "none", authActive: true }

  // NOTE: We only consider the first security condition within the first condition
  const [schemeName, schemeData] = (Object.entries(sec)[0] ?? [
    undefined,
    undefined,
  ]) as [string | undefined, string[] | undefined]

  if (!schemeName || !schemeData) return { authType: "none", authActive: true }

  return resolveOpenAPIV3SecurityScheme(doc, schemeName, schemeData)
}

const parseOpenAPIV3Auth = (
  doc: OpenAPIV3.Document | OpenAPIV31.Document,
  op: OpenAPIV3.OperationObject | OpenAPIV31.OperationObject
): HoppRESTAuth => {
  const rootAuth = doc.security
    ? resolveOpenAPIV3Security(doc, doc.security)
    : undefined
  const opAuth = op.security
    ? resolveOpenAPIV3Security(doc, op.security)
    : undefined

  return opAuth ?? rootAuth ?? { authType: "none", authActive: true }
}

const resolveOpenAPIV2SecurityScheme = (
  scheme: OpenAPIV2.SecuritySchemeObject,
  _schemeData: string[]
): HoppRESTAuth => {
  if (scheme.type === "basic") {
    return { authType: "basic", authActive: true, username: "", password: "" }
  } else if (scheme.type === "apiKey") {
    // V2 only supports in: header and in: query
    return {
      authType: "api-key",
      addTo: scheme.in === "header" ? "Headers" : "Query params",
      authActive: true,
      key: scheme.name,
      value: "",
    }
  } else if (scheme.type === "oauth2") {
    // NOTE: We select flow on a first come basis on this order, accessCode > implicit > password > application
    if (scheme.flow === "accessCode") {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: scheme.tokenUrl ?? "",
        authURL: scheme.authorizationUrl ?? "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else if (scheme.flow === "implicit") {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: "",
        authURL: scheme.authorizationUrl ?? "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else if (scheme.flow === "application") {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: scheme.tokenUrl ?? "",
        authURL: "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else if (scheme.flow === "password") {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: scheme.tokenUrl ?? "",
        authURL: "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    } else {
      return {
        authType: "oauth-2",
        authActive: true,
        accessTokenURL: "",
        authURL: "",
        clientID: "",
        oidcDiscoveryURL: "",
        scope: _schemeData.join(" "),
        token: "",
      }
    }
  }

  return { authType: "none", authActive: true }
}

const resolveOpenAPIV2SecurityDef = (
  doc: OpenAPIV2.Document,
  schemeName: string,
  schemeData: string[]
): HoppRESTAuth => {
  const scheme = Object.entries(doc.securityDefinitions ?? {}).find(
    ([name]) => schemeName === name
  )

  if (!scheme) return { authType: "none", authActive: true }

  const schemeObj = scheme[1]

  return resolveOpenAPIV2SecurityScheme(schemeObj, schemeData)
}

const resolveOpenAPIV2Security = (
  doc: OpenAPIV2.Document,
  security: OpenAPIV2.SecurityRequirementObject[]
): HoppRESTAuth => {
  // NOTE: Hoppscotch only considers the first security requirement
  const sec = security[0] as OpenAPIV2.SecurityRequirementObject | undefined

  if (!sec) return { authType: "none", authActive: true }

  // NOTE: We only consider the first security condition within the first condition
  const [schemeName, schemeData] = (Object.entries(sec)[0] ?? [
    undefined,
    undefined,
  ]) as [string | undefined, string[] | undefined]

  if (!schemeName || !schemeData) return { authType: "none", authActive: true }

  return resolveOpenAPIV2SecurityDef(doc, schemeName, schemeData)
}

const parseOpenAPIV2Auth = (
  doc: OpenAPIV2.Document,
  op: OpenAPIV2.OperationObject
): HoppRESTAuth => {
  const rootAuth = doc.security
    ? resolveOpenAPIV2Security(doc, doc.security)
    : undefined
  const opAuth = op.security
    ? resolveOpenAPIV2Security(doc, op.security)
    : undefined

  return opAuth ?? rootAuth ?? { authType: "none", authActive: true }
}

const parseOpenAPIAuth = (
  doc: OpenAPI.Document,
  op: OpenAPIOperationType
): HoppRESTAuth =>
  isOpenAPIV3Operation(doc, op)
    ? parseOpenAPIV3Auth(doc as OpenAPIV3.Document | OpenAPIV31.Document, op)
    : parseOpenAPIV2Auth(doc as OpenAPIV2.Document, op)

const convertPathToHoppReqs = (
  doc: OpenAPI.Document,
  pathName: string,
  pathObj: OpenAPIPathInfoType
) =>
  pipe(
    ["get", "head", "post", "put", "delete", "options", "patch"] as const,

    // Filter and map out path info
    RA.filterMap(
      flow(
        O.fromPredicate((method) => !!pathObj[method]),
        O.map((method) => ({ method, info: pathObj[method]! }))
      )
    ),

    // Construct request object
    RA.map(({ method, info }) =>
      makeRESTRequest({
        name: info.operationId ?? info.summary ?? "Untitled Request",
        method: method.toUpperCase(),
        endpoint: `<<baseUrl>>${replaceOpenApiPathTemplating(pathName)}`, // TODO: Make this proper

        // We don't need to worry about reference types as the Dereferencing pass should remove them
        params: parseOpenAPIParams(
          (info.parameters as OpenAPIParamsType[] | undefined) ?? []
        ),
        headers: parseOpenAPIHeaders(
          (info.parameters as OpenAPIParamsType[] | undefined) ?? []
        ),

        auth: parseOpenAPIAuth(doc, info),

        body: parseOpenAPIBody(doc, info),

        preRequestScript: "",
        testScript: "",
      })
    ),

    // Disable Readonly
    RA.toArray
  )

const convertOpenApiDocToHopp = (
  doc: OpenAPI.Document
): TE.TaskEither<never, HoppCollection<HoppRESTRequest>[]> => {
  const name = doc.info.title

  const paths = Object.entries(doc.paths ?? {})
    .map(([pathName, pathObj]) => convertPathToHoppReqs(doc, pathName, pathObj))
    .flat()

  return TE.of([
    makeCollection<HoppRESTRequest>({
      name,
      folders: [],
      requests: paths,
    }),
  ])
}

const parseOpenAPIDocContent = (str: string) =>
  pipe(
    str,
    safeParseJSON,
    O.match(
      () => safeParseYAML(str),
      (data) => O.of(data)
    )
  )

export default defineImporter({
  id: "openapi",
  name: "import.from_openapi",
  applicableTo: ["my-collections", "team-collections", "url-import"],
  icon: "file",
  steps: [
    step({
      stepName: "FILE_IMPORT",
      metadata: {
        caption: "import.from_openapi_description",
        acceptedFileTypes: ".json, .yaml, .yml",
      },
    }),
  ] as const,
  importer: ([fileContent]) =>
    pipe(
      // See if we can parse JSON properly
      fileContent,
      parseOpenAPIDocContent,
      TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT),
      // Try validating, else the importer is invalid file format
      TE.chainW((obj) =>
        pipe(
          TE.tryCatch(
            () => SwaggerParser.validate(obj),
            () => IMPORTER_INVALID_FILE_FORMAT
          )
        )
      ),
      // Deference the references
      TE.chainW((obj) =>
        pipe(
          TE.tryCatch(
            () => SwaggerParser.dereference(obj),
            () => OPENAPI_DEREF_ERROR
          )
        )
      ),
      TE.chainW(convertOpenApiDocToHopp)
    ),
})
