import * as TE from "fp-ts/TaskEither"
import { client } from "../GQLClient"
import {
  GetMockServerLogsDocument,
  GetMockServerLogsQuery,
  GetMockServerLogsQueryVariables,
  DeleteMockServerLogDocument,
  DeleteMockServerLogMutation,
  DeleteMockServerLogMutationVariables,
} from "../graphql"

export const getMockServerLogs = (
  mockServerID: string,
  skip?: number,
  take?: number
) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.query<
          GetMockServerLogsQuery,
          GetMockServerLogsQueryVariables
        >(GetMockServerLogsDocument, { mockServerID, skip, take })
        .toPromise()

      if (result.error)
        throw new Error(
          result.error.message || "Failed to fetch mock server logs"
        )
      if (!result.data) throw new Error("No data returned from mockServerLogs")

      return result.data.mockServerLogs
    },
    (e) => (e as Error).message
  )

export const deleteMockServerLog = (logID: string) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.mutation<
          DeleteMockServerLogMutation,
          DeleteMockServerLogMutationVariables
        >(DeleteMockServerLogDocument, { logID })
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
