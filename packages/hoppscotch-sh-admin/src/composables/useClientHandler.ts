import { TypedDocumentNode, useClientHandle } from '@urql/vue';
import { DocumentNode } from 'graphql';
import { ref } from 'vue';

/** A composable function to handle grapqhl requests
 * using urql's useClientHandle
 * @param query The query to be executed
 * @param getList A function to get the list from the result
 * @param variables The variables to be passed to the query
 */
export function useClientHandler<
  Result,
  Vars extends Record<string, any>,
  ListItem
>(
  query: string | TypedDocumentNode<Result, Vars> | DocumentNode,
  getList: (result: Result) => ListItem[],
  variables: Vars
) {
  const { client } = useClientHandle();
  const fetching = ref(true);
  const error = ref(false);
  const list = ref<ListItem[]>([]);

  const fetchList = async () => {
    fetching.value = true;
    try {
      const result = await client
        .query(query, {
          ...variables,
        })
        .toPromise();

      const resultList = getList(result.data!);

      list.value.push(...resultList);
    } catch (e) {
      error.value = true;
    }
    fetching.value = false;
  };

  return {
    fetching,
    error,
    list,
    fetchList,
  };
}
