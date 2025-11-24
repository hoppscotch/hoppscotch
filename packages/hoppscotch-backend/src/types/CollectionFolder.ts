import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// This class defines how data will be received from the app when we are importing Hoppscotch collections
export class CollectionFolder {
  @ApiPropertyOptional({
    description: 'Unique identifier for the collection folder',
    example: 'folder_12345',
  })
  id?: string;

  @ApiProperty({
    description: 'List of subfolders',
    type: () => [CollectionFolder],
  })
  folders: CollectionFolder[];

  @ApiProperty({
    description: 'List of requests in the collection folder',
    type: [Object],
  })
  requests: any[];

  @ApiProperty({
    description: 'Name of the collection folder',
    example: 'My Collection Folder',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Additional data for the collection folder',
    type: String,
  })
  data?: string;
}
