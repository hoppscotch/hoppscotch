import { OpenAPIV2 } from "openapi-types"
import * as O from "fp-ts/Option"
import { pipe, flow } from "fp-ts/function"
import * as A from "fp-ts/Array"
import { prettyPrintJSON } from "~/helpers/functional/json"

type PrimitiveSchemaType = "string" | "integer" | "number" | "boolean"

type SchemaType = "array" | "object" | PrimitiveSchemaType

type PrimitiveRequestBodyExample = number | string | boolean

type RequestBodyExample =
  | { [name: string]: RequestBodyExample }
  | Array<RequestBodyExample>
  | PrimitiveRequestBodyExample

const getPrimitiveTypePlaceholder = (
  schemaType: PrimitiveSchemaType
): PrimitiveRequestBodyExample => {
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
): RequestBodyExample =>
  pipe(
    schema.enum,
    O.fromNullable,
    O.map((enums) => enums[0] as RequestBodyExample),
    O.altW(() =>
      pipe(
        schema,
        getSchemaTypeFromSchemaObject,
        O.filter(isSchemaTypePrimitive),
        O.map(getPrimitiveTypePlaceholder)
      )
    ),
    O.getOrElseW(() => "")
  )

const generateExampleArrayFromOpenAPIV2ItemsObject = (
  items: OpenAPIV2.ItemsObject
): RequestBodyExample => {
  // Guard against undefined items
  if (!items || !items.type) {
    return []
  }

  // ItemsObject can not hold type "object"
  // https://swagger.io/specification/v2/#itemsObject

  // TODO : Handle array of objects
  // https://stackoverflow.com/questions/60490974/how-to-define-an-array-of-objects-in-openapi-2-0

  return pipe(
    items,
    O.fromPredicate(
      flow((items) => items.type as SchemaType, isSchemaTypePrimitive)
    ),
    O.map(flow(getSampleEnumValueOrPlaceholder, (arrayItem) => [arrayItem])),
    O.getOrElse(() =>
      // If the type is not primitive, it is "array"
      // items property is required if type is array
      items.items
        ? [
            generateExampleArrayFromOpenAPIV2ItemsObject(
              items.items as OpenAPIV2.ItemsObject
            ),
          ]
        : []
    )
  )
}

const generateRequestBodyExampleFromOpenAPIV2BodySchema = (
  schema: OpenAPIV2.SchemaObject
): RequestBodyExample => {
  if (schema.example) return schema.example as RequestBodyExample

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
    O.filter((items) => items !== null), // Filter out null/undefined items
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
      {} as { [name: string]: RequestBodyExample },
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

export const generateRequestBodyExampleFromOpenAPIV2Body = (
  op: OpenAPIV2.OperationObject
): string =>
  pipe(
    (op.parameters ?? []) as OpenAPIV2.Parameter[],
    A.findFirst((param) => param.in === "body"),
    O.map(
      flow(
        (parameter) => parameter.schema,
        generateRequestBodyExampleFromOpenAPIV2BodySchema
      )
    ),
    O.chain(prettyPrintJSON),
    O.getOrElse(() => "")
  )
