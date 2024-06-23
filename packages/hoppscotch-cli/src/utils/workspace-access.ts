import {
  CollectionSchemaVersion,
  Environment,
  EnvironmentSchemaVersion,
  HoppCollection,
  HoppRESTRequest,
} from "@hoppscotch/data";

import { HoppEnvPair } from "../types/request";

export interface WorkspaceEnvironment {
  id: string;
  teamID: string;
  name: string;
  variables: HoppEnvPair[];
}

export interface WorkspaceCollection {
  id: string;
  data: string | null;
  title: string;
  parentID: string | null;
  folders: WorkspaceCollection[];
  requests: WorkspaceRequest[];
}

interface WorkspaceRequest {
  id: string;
  collectionID: string;
  teamID: string;
  title: string;
  request: string;
}

/**
 * Transforms the incoming list of workspace requests by applying `JSON.parse` to the `request` field.
 *
 * @param {WorkspaceRequest[]} requests - An array of workspace request objects to be transformed.
 * @returns {HoppRESTRequest[]} The transformed array of requests conforming to the `HoppRESTRequest` type.
 */
const transformWorkspaceRequests = (
  requests: WorkspaceRequest[]
): HoppRESTRequest[] => requests.map(({ request }) => JSON.parse(request));

/**
 * Transforms the incoming list of workspace child collections to the `HoppCollection` type.
 *
 * @param {WorkspaceCollection[]} childCollections - An array of workspace collection objects to be transformed.
 * @returns {HoppCollection[]} The transformed array of collections conforming to the `HoppCollection` type.
 */
const transformWorkspaceChildCollections = (
  childCollections: WorkspaceCollection[]
): HoppCollection[] => {
  return childCollections.map(({ id, title, data, folders, requests }) => {
    const parsedData = data ? JSON.parse(data) : {};
    const { auth = { authType: "inherit", authActive: true }, headers = [] } =
      parsedData;

    return {
      v: CollectionSchemaVersion,
      id,
      name: title,
      folders: transformWorkspaceChildCollections(folders),
      requests: transformWorkspaceRequests(requests),
      auth,
      headers,
    };
  });
};

/**
 * Transforms workspace environment data to the `HoppEnvironment` format.
 *
 * @param {WorkspaceEnvironment} workspaceEnvironment - The workspace environment object to transform.
 * @returns {Environment} The transformed environment object conforming to the `Environment` type.
 */
export const transformWorkspaceEnvironment = (
  workspaceEnvironment: WorkspaceEnvironment
): Environment => {
  const { teamID, variables, ...rest } = workspaceEnvironment;

  // Add `secret` field if the data conforms to an older schema
  const transformedEnvVars = variables.map((variable) => {
    if (!("secret" in variable)) {
      return {
        ...(variable as HoppEnvPair),
        secret: false,
      } as HoppEnvPair;
    }

    return variable;
  });

  return {
    v: EnvironmentSchemaVersion,
    variables: transformedEnvVars,
    ...rest,
  };
};
/**
 * Transforms workspace collection data to the `HoppCollection` format.
 *
 * @param {WorkspaceCollection} collection - The workspace collection object to be transformed.
 * @returns {HoppCollection} The transformed collection object conforming to the `HoppCollection` type.
 */
export const transformWorkspaceCollection = (
  collection: WorkspaceCollection
): HoppCollection => {
  const { id, title, data, requests, folders } = collection;

  const parsedData = data ? JSON.parse(data) : {};
  const { auth = { authType: "inherit", authActive: true }, headers = [] } =
    parsedData;

  return {
    v: CollectionSchemaVersion,
    id,
    name: title,
    folders: transformWorkspaceChildCollections(folders),
    requests: transformWorkspaceRequests(requests),
    auth,
    headers,
  };
};
