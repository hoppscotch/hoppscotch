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
  MoveRestTeamCollectionDocument,
  MoveRestTeamCollectionMutation,
  MoveRestTeamCollectionMutationVariables,
  RenameCollectionDocument,
  RenameCollectionMutation,
  RenameCollectionMutationVariables,
  UpdateCollectionOrderDocument,
  UpdateCollectionOrderMutation,
  UpdateCollectionOrderMutationVariables,
} from "../graphql"

type CreateNewRootCollectionError = "team_coll/short_title"

type CreateChildCollectionError = "team_coll/short_title"

type RenameCollectionError = "team_coll/short_title"

type DeleteCollectionError = "team/invalid_coll_id"

type MoveRestTeamCollectionError =
  | "team/invalid_coll_id"
  | "team_coll/invalid_target_id"
  | "team/collection_is_parent_coll"
  | "team/target_and_destination_collection_are_same"
  | "team/target_collection_is_already_root_collection"

type UpdateCollectionOrderError =
  | "team/invalid_coll_id"
  | "team/collection_and_next_collection_are_same"
  | "team/team_collections_have_different_parents"

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

/** Can be used to move both collection and folder (considered same in BE) */
export const moveRESTTeamCollection = (
  collectionID: string,
  destinationCollectionID: string | null
) =>
  runMutation<
    MoveRestTeamCollectionMutation,
    MoveRestTeamCollectionMutationVariables,
    MoveRestTeamCollectionError
  >(MoveRestTeamCollectionDocument, {
    collectionID,
    parentCollectionID: destinationCollectionID,
  })

export const updateOrderRESTTeamCollection = (
  collectionID: string,
  destCollID: string
) =>
  runMutation<
    UpdateCollectionOrderMutation,
    UpdateCollectionOrderMutationVariables,
    UpdateCollectionOrderError
  >(UpdateCollectionOrderDocument, {
    collectionID,
    destCollID,
  })

export const importJSONToTeam = (collectionJSON: string, teamID: string) =>
  runMutation<ImportFromJsonMutation, ImportFromJsonMutationVariables, "">(
    ImportFromJsonDocument,
    {
      jsonString: collectionJSON,
      teamID,
    }
  )
