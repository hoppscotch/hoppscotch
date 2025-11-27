import { runMutation } from "../GQLClient"
import {
  CreatePublishedDocDocument,
  CreatePublishedDocMutation,
  CreatePublishedDocMutationVariables,
  UpdatePublishedDocDocument,
  UpdatePublishedDocMutation,
  UpdatePublishedDocMutationVariables,
  DeletePublishedDocDocument,
  DeletePublishedDocMutation,
  DeletePublishedDocMutationVariables,
  CreatePublishedDocsArgs,
  UpdatePublishedDocsArgs,
} from "../graphql"

type CreatePublishedDocError =
  | "published_docs/creation_failed"
  | "published_docs/invalid_collection"
  | "team/invalid_id"

type UpdatePublishedDocError =
  | "published_docs/update_failed"
  | "published_docs/not_found"

type DeletePublishedDocError =
  | "published_docs/deletion_failed"
  | "published_docs/not_found"

export const createPublishedDoc = (doc: CreatePublishedDocsArgs) =>
  runMutation<
    CreatePublishedDocMutation,
    CreatePublishedDocMutationVariables,
    CreatePublishedDocError
  >(CreatePublishedDocDocument, {
    args: doc,
  })

export const updatePublishedDoc = (id: string, doc: UpdatePublishedDocsArgs) =>
  runMutation<
    UpdatePublishedDocMutation,
    UpdatePublishedDocMutationVariables,
    UpdatePublishedDocError
  >(UpdatePublishedDocDocument, {
    id,
    args: doc,
  })

export const deletePublishedDoc = (id: string) =>
  runMutation<
    DeletePublishedDocMutation,
    DeletePublishedDocMutationVariables,
    DeletePublishedDocError
  >(DeletePublishedDocDocument, {
    id,
  })
