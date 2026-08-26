import { Field, ID, ObjectType } from '@nestjs/graphql';
import { WorkspaceType } from 'src/types/WorkspaceTypes';

@ObjectType()
export class McpShare {
  @Field(() => ID, { description: 'ID of the MCP share' })
  id: string;

  @Field({ description: 'URL-safe share token used in the endpoint path' })
  shareToken: string;

  @Field({ description: 'ID of the associated collection' })
  collectionID: string;

  @Field(() => WorkspaceType, { description: 'Type of workspace: USER or TEAM' })
  workspaceType: WorkspaceType;

  @Field({ description: 'Date and time when the share was created' })
  createdOn: Date;

  @Field({ nullable: true, description: 'Expiry date (null = no expiry)' })
  expiresAt?: Date;

  @Field({ description: 'Whether the share is active' })
  isActive: boolean;

  @Field({
    description:
      'MCP server URL using path pattern (e.g., https://backend.hoppscotch.io/v1/mcp/<token>)',
  })
  shareUrlPathBased: string;

  @Field({
    nullable: true,
    description:
      'MCP server URL using domain pattern (null if MCP_SHARE_WILDCARD_DOMAIN not configured)',
  })
  shareUrlDomainBased?: string;
}
