import { runMutation } from "../GQLClient"
import {
  DeleteUserDocument,
  DeleteUserMutation,
  DeleteUserMutationVariables,
} from "../graphql"

type DeleteUserErrors = "user/not_found"

export const deleteUser = () =>
  runMutation<
    DeleteUserMutation,
    DeleteUserMutationVariables,
    DeleteUserErrors
  >(DeleteUserDocument, {})
