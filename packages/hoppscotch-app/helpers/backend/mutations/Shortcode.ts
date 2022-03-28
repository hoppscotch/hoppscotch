import { HoppRESTRequest } from "@hoppscotch/data"
import { runMutation } from "../GQLClient"
import {
  CreateShortcodeDocument,
  CreateShortcodeMutation,
  CreateShortcodeMutationVariables,
} from "../graphql"

export const createShortcode = (request: HoppRESTRequest) =>
  runMutation<CreateShortcodeMutation, CreateShortcodeMutationVariables, "">(
    CreateShortcodeDocument,
    {
      request: JSON.stringify(request),
    }
  )
