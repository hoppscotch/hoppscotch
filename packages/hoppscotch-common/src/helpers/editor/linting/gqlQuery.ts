import { Ref } from "vue"
import {
  GraphQLError,
  GraphQLSchema,
  parse as gqlParse,
  validate as gqlValidate,
} from "graphql"
import { LinterDefinition, LinterResult } from "./linter"

/**
 * Creates a Linter function that can lint a GQL query against a given
 * schema
 */
export const createGQLQueryLinter: (
  schema: Ref<GraphQLSchema | null>
) => LinterDefinition = (schema: Ref<GraphQLSchema | null>) => (text) => {
  if (text === "") return Promise.resolve([])
  if (!schema.value) return Promise.resolve([])

  try {
    const doc = gqlParse(text)

    const results = gqlValidate(schema.value, doc).map(
      ({ locations, message }) =>
        <LinterResult>{
          from: {
            line: locations![0].line,
            ch: locations![0].column - 1,
          },
          to: {
            line: locations![0].line,
            ch: locations![0].column - 1,
          },
          message,
          severity: "error",
        }
    )

    return Promise.resolve(results)
  } catch (e) {
    const err = e as GraphQLError

    return Promise.resolve([
      <LinterResult>{
        from: {
          line: err.locations![0].line,
          ch: err.locations![0].column - 1,
        },
        to: {
          line: err.locations![0].line,
          ch: err.locations![0].column,
        },
        message: err.message,
        severity: "error",
      },
    ])
  }
}
