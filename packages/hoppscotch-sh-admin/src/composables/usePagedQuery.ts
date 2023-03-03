import { TypedDocumentNode, useClientHandle } from '@urql/vue';
import { DocumentNode } from 'graphql';
import { onMounted, ref } from 'vue';

export function usePagedQuery<
  Result,
  Vars extends Record<string, any>,
  ListItem
>(
  query: string | TypedDocumentNode<Result, Vars> | DocumentNode,
  getList: (result: Result) => ListItem[],
  getCursor: (value: ListItem) => string,
  variables: Vars
) {
  //Fetch All Users
  const { client } = useClientHandle();
  const fetching = ref(true);
  const error = ref(false);
  const list = ref<any[]>([]);
  const currentPage = ref(1);

  onMounted(async () => {
    fetching.value = true;
    try {
      const result = await client.query(query, variables).toPromise();

      const resultList = getList(result.data!);

      list.value.push(...resultList);
    } catch (e) {
      error.value = true;
    }
    fetching.value = false;
  });

  const goToNextPage = async () => {
    if (list.value.length % 20 === 0) {
      fetching.value = true;
      try {
        const result = await client
          .query(query, {
            ...variables,
            cursor: getCursor(list.value.at(-1)),
          })
          .toPromise();
        const resultList = getList(result.data!);

        list.value.push(...resultList);
        currentPage.value++;
      } catch (e) {
        error.value = true;
      }
      fetching.value = false;
    }
  };

  return {
    fetching,
    error,
    goToNextPage,
    list,
  };
}
