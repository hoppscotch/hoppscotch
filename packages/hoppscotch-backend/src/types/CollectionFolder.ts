// This interface defines how data will be received from the app when we are importing Hoppscotch collections
export interface CollectionFolder {
  id?: string;
  folders: CollectionFolder[];
  requests: any[];
  name: string;
  data?: string;
}
