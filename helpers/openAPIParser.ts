import { OpenAPIV3 } from "openapi-types"

let components: OpenAPIV3.ComponentsObject = {}

const baseRequest: any = {
  url: "",
  path: "",
  method: "GET",
  auth: "None",
  httpUser: "",
  httpPassword: "",
  passwordFieldType: "password",
  bearerToken: "",
  headers: [],
  params: [],
  bodyParams: [],
  rawParams: "",
  rawInput: false,
  contentType: "application/json",
  requestType: "curl",
  preRequestScript: "// pw.env.set('variable', 'value');",
  testScript: "// pw.expect('variable').toBe('value');",
  name: "",
}

function isOperationType(object: any): object is OpenAPIV3.OperationObject {
  return !!object.responses
}

// function isRequestBodyType(object: any): object is OpenAPIV3.RequestBodyObject {
//   return true
// }

// function isParameterType(object: any): object is OpenAPIV3.ParameterObject {
//   return true
// }

// const isSchemaObjectType = (object: any): object is OpenAPIV3.SchemaObject =>
//   true
// const isResponseObjectType = (
//   object: any
// ): object is OpenAPIV3.ResponseObject => true
const isExampleObjectType = (object: any): object is OpenAPIV3.ExampleObject =>
  !!object.value
// const isParameterObjectType = (
//   object: any
// ): object is OpenAPIV3.ParameterObject => true
const isRequestBodyObjectType = (
  object: any
): object is OpenAPIV3.RequestBodyObject => !!object.content
// const isHeaderObjectType = (object: any): object is OpenAPIV3.HeaderObject =>
//   true
// const isSecuritySchemeObjectType = (
//   object: any
// ): object is OpenAPIV3.SecuritySchemeObject => true
// const isLinkObjectType = (object: any): object is OpenAPIV3.LinkObject => true
// const isCallbackObjectType = (
//   object: any
// ): object is OpenAPIV3.CallbackObject => true

const isReferenceObjectType = (
  object: any
): object is OpenAPIV3.ReferenceObject => !!object.$ref

function fetchComponent(
  child:
    | "schemas"
    | "responses"
    | "parameters"
    | "examples"
    | "requestBodies"
    | "headers"
    | "securitySchemes"
    | "links"
    | "callbacks",
  name: string
) {
  const temp: { [key: string]: any } | undefined = components[child]

  if (typeof temp === "undefined") return null

  let component: any = temp[name]

  if (isReferenceObjectType(component)) {
    component = fetchComponent(child, component.$ref?.split("/").pop() ?? "")
  }

  return component
}

const parsePathItem = function (
  path: String,
  pathItem: OpenAPIV3.PathItemObject
) {
  const parsed: Array<any> = []

  for (const [operationType, operation] of Object.entries(pathItem)) {
    if (!isOperationType(operation)) continue
    const temp = parseOperation(path, operationType, operation)
    parsed.push(temp)
  }

  return parsed
}

const parseOperation = function (
  path: String,
  operationType: String,
  operation: OpenAPIV3.OperationObject
): any {
  let requestObject: any = baseRequest
  const values: Array<Object> = [
    parsePath(path),
    parseContentType(operation.requestBody),
    parseMethod(operationType),
    parseSummary(operation.summary),
    parseParams(operation.parameters),
    parseName(operation, path, operationType),
  ]

  let delta: Object = {}
  for (delta of values) requestObject = { ...requestObject, ...delta }
  return requestObject
}

const parseContentType = function (
  requestBody:
    | OpenAPIV3.RequestBodyObject
    | OpenAPIV3.ReferenceObject
    | undefined
) {
  if (typeof requestBody === "undefined") return { contentType: "" }
  if (isReferenceObjectType(requestBody)) {
    requestBody = fetchComponent(
      "requestBodies",
      requestBody.$ref?.split("/").pop() ?? ""
    )
  }
  if (isRequestBodyObjectType(requestBody))
    return { contentType: Object.keys(requestBody.content)[0] }

  return { contentType: "" }
}

const parsePath = function (path: String) {
  const pathValue = path.replaceAll(/{([^}]+)}/g, "<<$1>>")
  return { path: pathValue }
}

const parseMethod = function (operationType: String) {
  return { method: operationType.toUpperCase() }
}

const parseSummary = function (summary: String | undefined) {
  if (typeof summary !== "string") return {}
  return { openapi_summary: summary }
}

const parseName = function (
  operation: OpenAPIV3.OperationObject,
  path: String,
  operationType: String
) {
  let namer = ""
  if (operation.operationId) {
    namer = operation.operationId
  } else {
    namer = `${path} - ${operationType}`
  }
  return { name: namer }
}

const parseParams = function (
  parameters:
    | (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]
    | undefined
) {
  if (typeof parameters === "undefined") return {}
  parameters = parameters.map((p) => {
    if (isReferenceObjectType(p)) {
      p = fetchComponent("parameters", p.$ref?.split("/").pop() ?? "")
    }
    return p
  })

  const result = parameters
    .filter((p): p is OpenAPIV3.ParameterObject => true)
    .filter((p) => p.in === "query" || p.in === "path")
    .map((p) => {
      const temp: any = {
        key: p.name,
        active: true,
        value: "",
      }

      if (p.in === "path") {
        temp.type = "path"
      }

      if (p.example) {
        temp.value = p.example
      }

      if (p.examples) {
        const f = Object.values(p.examples)
        if (f.length) {
          let temp1 = f[0]
          if (isReferenceObjectType(temp1)) {
            temp1 = fetchComponent(
              "examples",
              temp1.$ref?.split("/").pop() ?? ""
            )
          }
          temp.value = isExampleObjectType(temp1) ? temp1.value : ""
        }
      }
      return temp
    })
  return { params: result }
}

export default function (filecontent: OpenAPIV3.Document) {
  const paths = filecontent.paths
  components = filecontent.components ?? {}
  const requests = []
  for (const [path, pathItem] of Object.entries(paths)) {
    const temp = parsePathItem(path, pathItem ?? {})
    requests.push(...temp)
  }
  console.log({ requests })
  return {
    name: filecontent.info.title,
    folders: [],
    requests,
  }
}
