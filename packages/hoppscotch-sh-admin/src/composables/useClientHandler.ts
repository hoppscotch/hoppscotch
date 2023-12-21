import { TypedDocumentNode, useClientHandle } from '@urql/vue';
import { DocumentNode } from 'graphql';
import { ref } from 'vue';

/** A composable function to handle grapqhl requests
 * using urql's useClientHandle
 * @param query The query to be executed
 * @param variables The variables to be passed to the query
 */
export function useClientHandler<Result, Vars extends Record<string, any>>(
  query: string | TypedDocumentNode<Result, Vars> | DocumentNode,
  variables: Vars
) {
  const { client } = useClientHandle();
  const fetching = ref(true);
  const error = ref(false);
  const fetchedData = ref<Result>();

  const fetchData = async () => {
    fetching.value = true;
    try {
      const result = await client
        .query(query, {
          ...variables,
        })
        .toPromise();

      fetchedData.value = result.data;
    } catch (e) {
      error.value = true;
    }
    fetching.value = false;
  };

  return {
    fetching,
    error,
    fetchData,
    fetchedData,
  };
}
