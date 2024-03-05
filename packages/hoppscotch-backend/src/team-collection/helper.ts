// Type of data returned from the query to obtain all search results
export type SearchQueryReturnType = {
  id: string;
  title: string;
  type: 'collection' | 'request';
  method?: string;
};

// Type of data returned from the query to obtain all parents
export type ParentTreeQueryReturnType = {
  id: string;
  parentID: string;
  title: string;
};
