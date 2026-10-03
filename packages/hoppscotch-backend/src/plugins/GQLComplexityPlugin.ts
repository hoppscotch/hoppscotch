import { GraphQLError } from 'graphql';
import type { ExecutionArgs } from 'graphql';
import type { Plugin } from 'graphql-yoga';
import {
  ComplexityEstimatorArgs,
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';

const COMPLEXITY_LIMIT = 50;

const complexityError = (args: ExecutionArgs, limit: number) => {
  const complexity = getComplexity({
    schema: args.schema,
    operationName: args.operationName ?? undefined,
    query: args.document,
    variables: (args.variableValues ?? {}) as Record<string, unknown>,
    estimators: [
      // Custom estimator for introspection fields
      (estimatorArgs: ComplexityEstimatorArgs) => {
        if (estimatorArgs.field.name.startsWith('__')) {
          return 0; // Return 0 complexity for introspection fields
        }
        return;
      },
      fieldExtensionsEstimator(),
      simpleEstimator({ defaultComplexity: 1 }),
    ],
  });

  return complexity > limit
    ? new GraphQLError(
        `Query is too complex: ${complexity}. Maximum allowed complexity: ${limit}`,
      )
    : null;
};

/**
 * Rejects operations (queries, mutations and subscriptions) whose estimated
 * complexity exceeds the limit, before they are executed.
 */
export const useComplexityLimit = (
  limit: number = COMPLEXITY_LIMIT,
): Plugin => ({
  onExecute({ args, setResultAndStopExecution }) {
    const error = complexityError(args, limit);
    if (error) setResultAndStopExecution({ errors: [error] });
  },
  onSubscribe({ args, setResultAndStopExecution }) {
    const error = complexityError(args, limit);
    if (error) setResultAndStopExecution({ errors: [error] });
  },
});
