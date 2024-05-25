import {
  CollectionSchemaVersion,
  Environment,
  EnvironmentSchemaVersion,
  HoppCollection,
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

const transformWorkspaceRequests = (requests: WorkspaceRequest[]) =>
  requests.map(({ request }) => JSON.parse(request));

const transformChildCollections = (
  childCollections: WorkspaceCollection[]
): HoppCollection[] => {
  return childCollections.map(({ id, title, data, folders, requests }) => {
    const parsedData = data ? JSON.parse(data) : {};
    const { auth = { authType: "inherit", authActive: false }, headers = [] } =
      parsedData;

    return {
      v: CollectionSchemaVersion,
      id,
      name: title,
      folders: transformChildCollections(folders),
      requests: transformWorkspaceRequests(requests),
      auth,
      headers,
    };
  });
};

// Helper function to transform workspace environment data to the `HoppEnvironment` format
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

// Helper function to transform workspace collection data to the `HoppCollection` format
export const transformWorkspaceCollection = (
  collection: WorkspaceCollection
): HoppCollection => {
  const { id, title, data, requests, folders } = collection;

  const parsedData = data ? JSON.parse(data) : {};
  const { auth = { authType: "inherit", authActive: false }, headers = [] } =
    parsedData;

  return {
    v: CollectionSchemaVersion,
    id,
    name: title,
    folders: transformChildCollections(folders),
    requests: transformWorkspaceRequests(requests),
    auth,
    headers,
  };
};
