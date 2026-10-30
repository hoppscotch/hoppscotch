import { Prisma, TeamRequest } from 'src/generated/prisma/client';

// Type of data returned from the query to obtain all search results
export type SearchQueryReturnType = {
  id: string;
  title: string;
  type: 'collection' | 'request';
  method?: string;
  // Only set for requests
  request?: Prisma.JsonValue;
  collectionID?: string;
  // Only set for collections
  data?: Prisma.JsonValue;
  parentID?: string | null;
};

// Type of data returned from the query to obtain all parents of search results
export type ParentTreeQueryReturnType = {
  id: string;
  parentID: string | null;
  title: string;
  data: Prisma.JsonValue;
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
