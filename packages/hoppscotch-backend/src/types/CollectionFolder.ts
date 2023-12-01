export interface CollectionFolder {
  id?: string;
  folders: CollectionFolder[];
  requests: any[];
  name: string;
  data?: string;
}
