import { TypedDocumentNode, useClientHandle } from '@urql/vue';
import { DocumentNode } from 'graphql';
import { onMounted, ref } from 'vue';

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

  // onMounted(async () => {
  //   await fetchList();
  // });

  // const refetch = async () => {
  //   await fetchList();
  // };

  return {
    fetching,
    error,
    list,
    fetchList,
  };
}
