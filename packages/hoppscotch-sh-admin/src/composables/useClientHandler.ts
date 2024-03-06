import { TypedDocumentNode, useClientHandle } from '@urql/vue';
import { DocumentNode } from 'graphql';
import { Ref, ref } from 'vue';

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
  variables: Vars,
  getList?: (result: Result) => ListItem[]
) {
  const { client } = useClientHandle();
  const fetching = ref(true);
  const error = ref(false);
  const data = ref<Result>();
  const dataAsList: Ref<ListItem[]> = ref([]);

  const fetchData = async () => {
    fetching.value = true;

    const result = await client
      .query(query, {
        ...variables,
      })
      .toPromise();

    if (result.error) {
      error.value = true;
      fetching.value = false;
      return;
    }

    if (getList) {
      const resultList = getList(result.data!);
      dataAsList.value.push(...resultList);
    } else {
      data.value = result.data;
    }

    fetching.value = false;
  };

  return {
    fetching,
    error,
    data,
    dataAsList,
    fetchData,
  };
}
