import { Prisma } from 'src/generated/prisma/client';

// Response type of results from the search query
export type CollectionSearchNode = {
  /** Encodes the hierarchy of where the node is **/
  path: CollectionSearchNode[];
} & (
  | {
      type: 'request';
      title: string;
      method: string;
      id: string;
      /** The full request, so clients do not have to fetch it again **/
      request: Prisma.JsonValue;
    }
  | {
      type: 'collection';
      title: string;
      id: string;
      /** The collection data (auth, headers, variables) as a JSON string **/
      data: string | null;
    }
);
