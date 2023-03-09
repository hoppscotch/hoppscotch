import { Prisma } from '@prisma/client';

export interface CollectionFolder {
  folders: CollectionFolder[];
  requests: any[];
  name: string;
}
