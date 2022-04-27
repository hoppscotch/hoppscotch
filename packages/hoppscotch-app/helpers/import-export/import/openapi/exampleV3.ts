import { OpenAPIV3 } from "openapi-types"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"

type SchemaType =
  | OpenAPIV3.ArraySchemaObjectType
  | OpenAPIV3.NonArraySchemaObjectType

type PrimitiveSchemaType = Exclude<SchemaType, "array" | "object">

type PrimitiveRequestBodyExampleType = string | number | boolean | null

type RequestBodyExampleType =
  | PrimitiveRequestBodyExampleType
  | Array<RequestBodyExampleType>
  | { [name: string]: RequestBodyExampleType }

const isSchemaTypePrimitive = (
  schemaType: SchemaType
): schemaType is PrimitiveSchemaType =>
  !["array", "object"].includes(schemaType)

const getPrimitiveTypePlaceholder = (
  primitiveType: PrimitiveSchemaType
): PrimitiveRequestBodyExampleType => {
  switch (primitiveType) {
    case "number":
      return 0.0
    case "integer":
      return 0
    case "string":
      return "string"
    case "boolean":
      return true
  }
}

// Use carefully, call only when type is primitive
// TODO(agarwal): Use Enum values, if any
const generatePrimitiveRequestBodyExample = (
  schemaObject: OpenAPIV3.NonArraySchemaObject
): RequestBodyExampleType =>
  getPrimitiveTypePlaceholder(schemaObject.type as PrimitiveSchemaType)

// Use carefully, call only when type is object
const generateObjectRequestBodyExample = (
  schemaObject: OpenAPIV3.NonArraySchemaObject
): RequestBodyExampleType =>
  pipe(
    schemaObject.properties,
    O.fromNullable,
    O.map(
      (properties) =>
        Object.entries(properties) as [string, OpenAPIV3.SchemaObject][]
    ),
    O.getOrElseW(() => [] as [string, OpenAPIV3.SchemaObject][]),
    A.reduce(
      {} as { [name: string]: RequestBodyExampleType },
      (aggregatedExample, property) => {
        aggregatedExample[property[0]] =
          generateRequestBodyExampleFromSchemaObject(property[1])
        return aggregatedExample
      }
    )
  )

const generateArrayRequestBodyExample = (
  schemaObject: OpenAPIV3.ArraySchemaObject
): RequestBodyExampleType =>
  Array.of(
    generateRequestBodyExampleFromSchemaObject(
      schemaObject.items as OpenAPIV3.SchemaObject
    )
  )

const generateRequestBodyExampleFromSchemaObject = (
  schemaObject: OpenAPIV3.SchemaObject
): RequestBodyExampleType => {
  // TODO: Handle schema objects with allof
  if (schemaObject.example)
    return schemaObject.example as RequestBodyExampleType

  // If request body can be oneof or allof several schema, choose the first schema to generate an example
  if (schemaObject.oneOf)
    return generateRequestBodyExampleFromSchemaObject(
      schemaObject.oneOf[0] as OpenAPIV3.SchemaObject
    )
  if (schemaObject.anyOf)
    return generateRequestBodyExampleFromSchemaObject(
      schemaObject.anyOf[0] as OpenAPIV3.SchemaObject
    )

  if (!schemaObject.type) return ""

  if (isSchemaTypePrimitive(schemaObject.type))
    return generatePrimitiveRequestBodyExample(
      schemaObject as OpenAPIV3.NonArraySchemaObject
    )

  if (schemaObject.type === "object")
    return generateObjectRequestBodyExample(
      schemaObject as OpenAPIV3.NonArraySchemaObject
    )

  return generateArrayRequestBodyExample(
    schemaObject as OpenAPIV3.ArraySchemaObject
  )
}

export const generateRequestBodyExampleFromMediaObject = (
  mediaObject: OpenAPIV3.MediaTypeObject
): RequestBodyExampleType => {
  if (mediaObject.example) return mediaObject.example as RequestBodyExampleType
  if (mediaObject.examples)
    return mediaObject.examples[0] as RequestBodyExampleType
  return mediaObject.schema
    ? generateRequestBodyExampleFromSchemaObject(
        mediaObject.schema as OpenAPIV3.SchemaObject
      )
    : ""
}
