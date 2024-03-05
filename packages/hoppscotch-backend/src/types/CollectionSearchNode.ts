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
    }
  | {
      type: 'collection';
      title: string;
      id: string;
    }
);
