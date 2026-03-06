import { gql } from "@urql/core"
import * as TE from "fp-ts/TaskEither"
import { client } from "../GQLClient"

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
  workspaceType: "USER" | "TEAM"
) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.mutation(CREATE_MCP_SHARE, { collectionID, workspaceType })
        .toPromise()

      if (result.error) {
        throw new Error(result.error.message || "Failed to create MCP share")
      }

      if (!result.data) {
        throw new Error("No data returned from create MCP share mutation")
      }

      return result.data.createMcpShare as McpShareResult
    },
    (error) => (error as Error).message
  )

export const deleteMcpShare = (shareToken: string) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.mutation(DELETE_MCP_SHARE, { shareToken })
        .toPromise()

      if (result.error) {
        throw new Error(result.error.message || "Failed to delete MCP share")
      }

      if (!result.data) {
        throw new Error("No data returned from delete MCP share mutation")
      }

      return result.data.deleteMcpShare as boolean
    },
    (error) => (error as Error).message
  )

export const getMyMcpShares = () =>
  TE.tryCatch(
    async () => {
      const result = await client.value!.query(MY_MCP_SHARES, {}).toPromise()

      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch MCP shares")
      }

      if (!result.data) {
        throw new Error("No data returned from MCP shares query")
      }

      return result.data.myMcpShares as McpShareResult[]
    },
    (error) => (error as Error).message
  )
