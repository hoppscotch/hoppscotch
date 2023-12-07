import { HoppRESTRequest } from "@hoppscotch/data"
import { runMutation } from "../GQLClient"
import {
  CreateShortcodeDocument,
  CreateShortcodeMutation,
  CreateShortcodeMutationVariables,
  DeleteShortcodeDocument,
  DeleteShortcodeMutation,
  DeleteShortcodeMutationVariables,
  UpdateEmbedPropertiesDocument,
  UpdateEmbedPropertiesMutation,
  UpdateEmbedPropertiesMutationVariables,
} from "../graphql"

type DeleteShortcodeErrors = "shortcode/not_found"

export const createShortcode = (
  request: HoppRESTRequest,
  properties?: string
) =>
  runMutation<CreateShortcodeMutation, CreateShortcodeMutationVariables, "">(
    CreateShortcodeDocument,
    {
      request: JSON.stringify(request),
      properties,
    }
  )

export const deleteShortcode = (code: string) =>
  runMutation<
    DeleteShortcodeMutation,
    DeleteShortcodeMutationVariables,
    DeleteShortcodeErrors
  >(DeleteShortcodeDocument, {
    code,
  })

export const updateEmbedProperties = (code: string, properties: string) =>
  runMutation<
    UpdateEmbedPropertiesMutation,
    UpdateEmbedPropertiesMutationVariables,
    ""
  >(UpdateEmbedPropertiesDocument, {
    code,
    properties,
  })
