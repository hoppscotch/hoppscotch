import { onMounted, ref, Ref } from 'vue';
import { DocumentNode } from 'graphql';
import { TypedDocumentNode, useClientHandle } from '@urql/vue';

export function usePagedQuery<
  Result,
  Vars extends Record<string, any>,
  ListItem
>(
  query: string | TypedDocumentNode<Result, Vars> | DocumentNode,
  getList: (result: Result) => ListItem[],
  itemsPerPage: number,
  baseVariables: Vars,
  getCursor?: (value: ListItem) => string
) {
  const { client } = useClientHandle();
  const fetching = ref(true);
  const error = ref(false);
  const list: Ref<ListItem[]> = ref([]);
  const currentPage = ref(0);
  const hasNextPage = ref(true);

  const fetchNextPage = async (additionalVariables?: Vars) => {
    let variables = { ...baseVariables };

    fetching.value = true;

    // Cursor based pagination
    if (getCursor) {
      const cursor =
        list.value.length > 0
          ? getCursor(list.value.at(-1) as ListItem)
          : undefined;
      variables = { ...variables, cursor };
    }
    // Offset based pagination
    else if (additionalVariables) {
      variables = { ...variables, ...additionalVariables };
    }

    const result = await client.query(query, variables).toPromise();
    if (result.error) {
      error.value = true;
      fetching.value = false;
      return;
    }

    const resultList = getList(result.data!);

    if (resultList.length < itemsPerPage) {
      hasNextPage.value = false;
    }

    list.value.push(...resultList);
    currentPage.value++;

    fetching.value = false;
  };

  onMounted(async () => {
    await fetchNextPage();
  });

  const goToNextPage = async () => {
    if (hasNextPage.value) {
      await fetchNextPage();
    }
  };

  const refetch = async (variables?: Vars) => {
    currentPage.value = 0;
    hasNextPage.value = true;
    list.value = [];

    if (hasNextPage.value) {
      variables ? await fetchNextPage(variables) : await fetchNextPage();
    }
  };

  return {
    fetching,
    error,
    goToNextPage,
    refetch,
    list,
    hasNextPage,
  };
}
