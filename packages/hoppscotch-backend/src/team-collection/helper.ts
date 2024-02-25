export type SearchQueryReturnType = {
  id: string;
  title: string;
  type: 'collection' | 'request';
  method?: string;
};
