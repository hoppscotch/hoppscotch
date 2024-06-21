/**
 * Picked is used to defrentiate
 * the select item in the save request dialog
 * The save request dialog can be used
 * to save a request, folder or a collection
 * seperately for my and teams for REST.
 * also for graphQL collections
 */
export type Picked =
  | {
      pickedType: "my-request"
      folderPath: string
      requestIndex: number
    }
  | {
      pickedType: "my-folder"
      folderPath: string
    }
  | {
      pickedType: "my-collection"
      collectionIndex: number
    }
  | {
      pickedType: "gql-my-request"
      folderPath: string
      requestIndex: number
    }
  | {
      pickedType: "gql-my-folder"
      folderPath: string
    }
  | {
      pickedType: "gql-my-collection"
      collectionIndex: number
    }
// TODO: Enable this when rest of the implementation is in place
// | {
//     pickedType: "teams-request"
//     requestID: string
//   }
// | {
//     pickedType: "teams-folder"
//     folderID: string
//   }
// | {
//     pickedType: "teams-collection"
//     collectionID: string
//   }
