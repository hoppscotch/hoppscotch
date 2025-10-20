import * as TE from "fp-ts/TaskEither"
import { client } from "../GQLClient"

type MockServerLog = {
  id: string
  mockServerID: string
  requestMethod: string
  requestPath: string
  requestHeaders: string
  requestBody?: string | null
  requestQuery?: string | null
  responseStatus: number
  responseHeaders: string
  responseBody?: string | null
  responseTime: number
  ipAddress?: string | null
  userAgent?: string | null
  executedAt: string
}

export const getMockServerLogs = (
  mockServerID: string,
  skip?: number,
  take?: number
) =>
  TE.tryCatch(
    async () => {
      const q = `query GetMockServerLogs($mockServerID: ID!, $skip: Int, $take: Int) {\n  mockServerLogs(mockServerID: $mockServerID, skip: $skip, take: $take) {\n    id\n    mockServerID\n    requestMethod\n    requestPath\n    requestHeaders\n    requestBody\n    requestQuery\n    responseStatus\n    responseHeaders\n    responseBody\n    responseTime\n    ipAddress\n    userAgent\n    executedAt\n  }\n}`

      const result = await client
        .value!.query(q as any, { mockServerID, skip, take })
        .toPromise()

      if (result.error)
        throw new Error(
          result.error.message || "Failed to fetch mock server logs"
        )
      if (!result.data) throw new Error("No data returned from mockServerLogs")

      return result.data.mockServerLogs as MockServerLog[]
    },
    (e) => (e as Error).message
  )

export const deleteMockServerLog = (logID: string) =>
  TE.tryCatch(
    async () => {
      const m = `mutation DeleteMockServerLog($id: ID!) {\n  deleteMockServerLog(id: $id)\n}`
      const result = await client
        .value!.mutation(m as any, { id: logID })
        .toPromise()
      if (result.error)
        throw new Error(
          result.error.message || "Failed to delete mock server log"
        )
      if (!result.data)
        throw new Error("No data returned from deleteMockServerLog")
      return result.data.deleteMockServerLog as boolean
    },
    (e) => (e as Error).message
  )
