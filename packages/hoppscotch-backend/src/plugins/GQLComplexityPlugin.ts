import { GraphQLSchemaHost } from '@nestjs/graphql';
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from 'apollo-server-plugin-base';
import { Plugin } from '@nestjs/apollo';
import { GraphQLError } from 'graphql';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';

const COMPLEXITY_LIMIT = 50;

@Plugin()
export class GQLComplexityPlugin implements ApolloServerPlugin {
  constructor(private gqlSchemaHost: GraphQLSchemaHost) {}

  async requestDidStart(): Promise<GraphQLRequestListener> {
    const { schema } = this.gqlSchemaHost;

    return {
      async didResolveOperation({ request, document }) {
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });
        if (complexity > COMPLEXITY_LIMIT) {
          throw new GraphQLError(
            `Query is too complex: ${complexity}. Maximum allowed complexity: ${COMPLEXITY_LIMIT}`,
          );
        }
        console.log('Query Complexity:', complexity);
      },
    };
  }
}
