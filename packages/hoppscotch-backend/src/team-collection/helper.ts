import { TeamRequest } from '@prisma/client';

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
// Type of data returned from the query to fetch collection details from CLI
export type GetCollectionResponse = {
  id: string;
  data: string | null;
  title: string;
  parentID: string | null;
  folders: GetCollectionResponse[];
  requests: TeamRequest[];
};
