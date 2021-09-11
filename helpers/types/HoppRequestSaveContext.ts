/**
 * We use the save context to figure out
 * how a loaded request is to be saved.
 * These will be set when the request is loaded
 * into the request session (RESTSession)
 */
export type HoppRequestSaveContext =
  | {
      /**
       * The origin source of the request
       */
      originLocation: "user-collection"
      /**
       * Path to the request folder
       */
      folderPath: string
      /**
       * Index to the request
       */
      requestIndex: number
    }
  | {
      /**
       * The origin source of the request
       */
      originLocation: "team-collection"
      /**
       * ID of the request in the team
       */
      requestID: string
      /**
       * ID of the team
       */
      teamID?: string
      /**
       * ID of the collection loaded
       */
      collectionID?: string
    }
