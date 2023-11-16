import {
  runMutation,
  runGQLQuery,
} from "@hoppscotch/common/helpers/backend/GQLClient"
import {
  GetCurrentRestSessionDocument,
  GetCurrentRestSessionQuery,
  GetCurrentRestSessionQueryVariables,
  SessionType,
  UpdateUserSessionDocument,
  UpdateUserSessionMutation,
  UpdateUserSessionMutationVariables,
} from "../../api/generated/graphql"

export const updateUserSession = (
  currentSession: string,
  sessionType: SessionType
) =>
  runMutation<
    UpdateUserSessionMutation,
    UpdateUserSessionMutationVariables,
    ""
  >(UpdateUserSessionDocument, {
    sessionType,
    currentSession,
  })()

export const getCurrentRestSession = () =>
  runGQLQuery<
    GetCurrentRestSessionQuery,
    GetCurrentRestSessionQueryVariables,
    ""
  >({
    query: GetCurrentRestSessionDocument,
    variables: {},
  })
