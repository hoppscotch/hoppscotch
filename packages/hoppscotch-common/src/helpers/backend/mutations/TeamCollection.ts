import { runMutation } from "../GQLClient"
import {
  CreateChildCollectionDocument,
  CreateChildCollectionMutation,
  CreateChildCollectionMutationVariables,
  CreateNewRootCollectionDocument,
  CreateNewRootCollectionMutation,
  CreateNewRootCollectionMutationVariables,
  DeleteCollectionDocument,
  DeleteCollectionMutation,
  DeleteCollectionMutationVariables,
  ImportFromJsonDocument,
  ImportFromJsonMutation,
  ImportFromJsonMutationVariables,
  RenameCollectionDocument,
  RenameCollectionMutation,
  RenameCollectionMutationVariables,
} from "../graphql"

type CreateNewRootCollectionError = "team_coll/short_title"
type CreateChildCollectionError = "team_coll/short_title"
type RenameCollectionError = "team_coll/short_title"
type DeleteCollectionError = "team/invalid_coll_id"

export const createNewRootCollection = (title: string, teamID: string) =>
  runMutation<
    CreateNewRootCollectionMutation,
    CreateNewRootCollectionMutationVariables,
    CreateNewRootCollectionError
  >(CreateNewRootCollectionDocument, {
    title,
    teamID,
  })

export const createChildCollection = (
  childTitle: string,
  collectionID: string
) =>
  runMutation<
    CreateChildCollectionMutation,
    CreateChildCollectionMutationVariables,
    CreateChildCollectionError
  >(CreateChildCollectionDocument, {
    childTitle,
    collectionID,
  })

/** Can be used to rename both collection and folder (considered same in BE) */
export const renameCollection = (collectionID: string, newTitle: string) =>
  runMutation<
    RenameCollectionMutation,
    RenameCollectionMutationVariables,
    RenameCollectionError
  >(RenameCollectionDocument, {
    collectionID,
    newTitle,
  })

/** Can be used to delete both collection and folder (considered same in BE) */
export const deleteCollection = (collectionID: string) =>
  runMutation<
    DeleteCollectionMutation,
    DeleteCollectionMutationVariables,
    DeleteCollectionError
  >(DeleteCollectionDocument, {
    collectionID,
  })

export const importJSONToTeam = (collectionJSON: string, teamID: string) =>
  runMutation<ImportFromJsonMutation, ImportFromJsonMutationVariables, "">(
    ImportFromJsonDocument,
    {
      jsonString: collectionJSON,
      teamID,
    }
  )
