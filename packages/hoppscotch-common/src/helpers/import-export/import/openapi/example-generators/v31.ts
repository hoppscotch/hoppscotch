import { OpenAPIV3_1 as OpenAPIV31 } from "openapi-types"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"

type MixedArraySchemaType = (
  | OpenAPIV31.ArraySchemaObjectType
  | OpenAPIV31.NonArraySchemaObjectType
)[]

type SchemaType =
  | OpenAPIV31.ArraySchemaObjectType
  | OpenAPIV31.NonArraySchemaObjectType
  | MixedArraySchemaType

type PrimitiveSchemaType = Exclude<
  OpenAPIV31.NonArraySchemaObjectType,
  "object"
>

type PrimitiveRequestBodyExample = string | number | boolean | null

type RequestBodyExample =
  | PrimitiveRequestBodyExample
  | Array<RequestBodyExample>
  | { [name: string]: RequestBodyExample }

const isSchemaTypePrimitive = (
  schemaType: SchemaType
): schemaType is PrimitiveSchemaType =>
  !Array.isArray(schemaType) && !["array", "object"].includes(schemaType)

const getPrimitiveTypePlaceholder = (
  primitiveType: PrimitiveSchemaType
): PrimitiveRequestBodyExample => {
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
  return null
}

// Use carefully, the schema type should necessarily be primitive
// TODO(agarwal): Use Enum values, if any
const generatePrimitiveRequestBodyExample = (
  schemaObject: OpenAPIV31.NonArraySchemaObject
): RequestBodyExample =>
  getPrimitiveTypePlaceholder(schemaObject.type as PrimitiveSchemaType)

// Use carefully, the schema type should necessarily be object
const generateObjectRequestBodyExample = (
  schemaObject: OpenAPIV31.NonArraySchemaObject
): RequestBodyExample =>
  pipe(
    schemaObject.properties,
    O.fromNullable,
    O.map(
      (properties) =>
        Object.entries(properties) as [string, OpenAPIV31.SchemaObject][]
    ),
    O.getOrElseW(() => [] as [string, OpenAPIV31.SchemaObject][]),
    A.reduce(
      {} as { [name: string]: RequestBodyExample },
      (aggregatedExample, property) => {
        aggregatedExample[property[0]] =
          generateRequestBodyExampleFromSchemaObject(property[1])
        return aggregatedExample
      }
    )
  )

// Use carefully, the schema type should necessarily be mixed array
const generateMixedArrayRequestBodyExample = (
  schemaObject: OpenAPIV31.SchemaObject
): RequestBodyExample =>
  pipe(
    schemaObject,
    (schemaObject) => schemaObject.type as MixedArraySchemaType,
    A.reduce([] as Array<RequestBodyExample>, (aggregatedExample, itemType) => {
      // TODO: Figure out how to include non-primitive types as well
      if (isSchemaTypePrimitive(itemType)) {
        aggregatedExample.push(getPrimitiveTypePlaceholder(itemType))
      }
      return aggregatedExample
    })
  )

const generateArrayRequestBodyExample = (
  schemaObject: OpenAPIV31.ArraySchemaObject
): RequestBodyExample => [
  generateRequestBodyExampleFromSchemaObject(
    schemaObject.items as OpenAPIV31.SchemaObject
  ),
]

const generateRequestBodyExampleFromSchemaObject = (
  schemaObject: OpenAPIV31.SchemaObject
): RequestBodyExample => {
  // TODO: Handle schema objects with oneof or anyof
  if (schemaObject.example) return schemaObject.example as RequestBodyExample
  if (schemaObject.examples)
    return schemaObject.examples[0] as RequestBodyExample
  if (!schemaObject.type) return ""
  if (isSchemaTypePrimitive(schemaObject.type))
    return generatePrimitiveRequestBodyExample(
      schemaObject as OpenAPIV31.NonArraySchemaObject
    )
  if (schemaObject.type === "object")
    return generateObjectRequestBodyExample(schemaObject)
  if (schemaObject.type === "array")
    return generateArrayRequestBodyExample(schemaObject)
  return generateMixedArrayRequestBodyExample(schemaObject)
}

export const generateRequestBodyExampleFromMediaObject = (
  mediaObject: OpenAPIV31.MediaTypeObject
): RequestBodyExample => {
  // First check for direct example
  if (mediaObject.example) return mediaObject.example as RequestBodyExample

  // Then check for examples object (OpenAPI v3.1 format)
  if (mediaObject.examples) {
    const firstExample = Object.values(mediaObject.examples)[0]
    if (
      firstExample &&
      typeof firstExample === "object" &&
      "value" in firstExample
    ) {
      return firstExample.value as RequestBodyExample
    }
    // Fallback if examples doesn't have the expected structure
    return Object.values(mediaObject.examples)[0] as RequestBodyExample
  }

  // Fallback to generating from schema
  return mediaObject.schema
    ? generateRequestBodyExampleFromSchemaObject(mediaObject.schema)
    : ""
}
