// generates a graphql query based on the documentation

import { GraphQLSchema, GraphQLObjectType, GraphQLType } from "graphql"

// function to generate the graphql query
export function generateQuery(
  schema: GraphQLSchema,
  max_nesting_depth: number
): string {
  // error handling
  if (!schema) {
    throw new Error("Error: Schema not loaded")
  }
  // gets the query type from the schema
  const queryType = schema.getQueryType()
  // error handling
  if (!queryType) {
    throw new Error("Error: Query type not found in schema")
  }
  return buildQuery(queryType, max_nesting_depth)
}
// function to build the query
export function buildQuery(
  type: GraphQLObjectType,
  max_nesting_depth: number
): string {
  // edge case handling
  if (max_nesting_depth === 0) return ""

  const fields = type.getFields()
  const queryFields = Object.keys(fields)
    .map((fieldName) => {
      const field = fields[fieldName]
      const fieldType = field.type
      // adds fields until max_nesting_depth reached, then return
      if (isObjectType(fieldType)) {
        return `${fieldName} { ${buildQuery(fieldType, max_nesting_depth - 1)} }`
      } else {
        return fieldName
      }
    })
    .join("\n")
  return `{\n${queryFields}\n}`
}

function isObjectType(type: GraphQLType): type is GraphQLObjectType {
  return type instanceof GraphQLObjectType
}
