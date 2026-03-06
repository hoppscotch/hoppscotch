import { gql } from "@urql/core"
import * as TE from "fp-ts/TaskEither"
import { client } from "../GQLClient"
import { GQLError } from "../GQLClient"

export type McpShareResult = {
  id: string
  shareToken: string
  collectionID: string
  workspaceType: string
  createdOn: Date
  expiresAt?: Date | null
  isActive: boolean
  shareUrlPathBased: string
  shareUrlDomainBased?: string | null
}

const CREATE_MCP_SHARE = gql`
  mutation CreateMcpShare($collectionID: ID!, $workspaceType: WorkspaceType!) {
    createMcpShare(collectionID: $collectionID, workspaceType: $workspaceType) {
      id
      shareToken
      collectionID
      workspaceType
      createdOn
      expiresAt
      isActive
      shareUrlPathBased
      shareUrlDomainBased
    }
  }
`

const DELETE_MCP_SHARE = gql`
  mutation DeleteMcpShare($shareToken: String!) {
    deleteMcpShare(shareToken: $shareToken)
  }
`

const MY_MCP_SHARES = gql`
  query MyMcpShares {
    myMcpShares {
      id
      shareToken
      collectionID
      workspaceType
      createdOn
      expiresAt
      isActive
      shareUrlPathBased
      shareUrlDomainBased
    }
  }
`

export const createMcpShare = (
  collectionID: string,
  workspaceType: "USER" | "TEAM",
): TE.TaskEither<GQLError<string>, McpShareResult> =>
  client.mutationTE(CREATE_MCP_SHARE, { collectionID, workspaceType }) as any

export const deleteMcpShare = (
  shareToken: string,
): TE.TaskEither<GQLError<string>, boolean> =>
  client.mutationTE(DELETE_MCP_SHARE, { shareToken }) as any

export const getMyMcpShares = (): TE.TaskEither<
  GQLError<string>,
  McpShareResult[]
> => client.queryTE(MY_MCP_SHARES, {}) as any
