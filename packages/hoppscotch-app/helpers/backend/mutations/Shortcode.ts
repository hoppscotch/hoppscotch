import { runMutation } from "../GQLClient"
import {
  CreateShortcodeDocument,
  CreateShortcodeMutation,
  CreateShortcodeMutationVariables,
} from "../graphql"
import { HoppRESTRequest } from "~/helpers/types/HoppRESTRequest"

export const createShortcode = (request: HoppRESTRequest) =>
  runMutation<CreateShortcodeMutation, CreateShortcodeMutationVariables, "">(
    CreateShortcodeDocument,
    {
      request: JSON.stringify(request),
    }
  )
