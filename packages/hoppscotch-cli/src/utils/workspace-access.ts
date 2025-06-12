import {
  CollectionSchemaVersion,
  Environment,
  EnvironmentSchemaVersion,
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeaders,
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
 * It includes the `v` field indicating the schema version, but migration is handled already at the `parseCollectionData()` helper function.
 *
 * @param {WorkspaceRequest[]} requests - An array of workspace request objects to be transformed.
 * @returns {HoppRESTRequest[]} The transformed array of requests conforming to the `HoppRESTRequest` type.
 */
const transformWorkspaceRequests = (
  requests: WorkspaceRequest[]
): HoppRESTRequest[] => requests.map(({ request }) => JSON.parse(request));

/**
 * Apply relevant migrations for data conforming to older formats
 *
 * @param {HoppEnvPair} variable - The environment variable to normalize.
 * @returns {HoppEnvPair} The normalized environment variable conforming to the `HoppEnvPair` type.
 */
const normalizeEnvironmentVariable = (variable: HoppEnvPair): HoppEnvPair => {
  if (
    "secret" in variable &&
    "initialValue" in variable &&
    "currentValue" in variable
  ) {
    return variable;
  }

  const envPair = variable as Partial<HoppEnvPair> & {
    key: string;
    value?: string;
  };

  const isSecret = !!envPair.secret;
  const value = envPair.value ?? "";

  return {
    key: envPair.key,
    secret: isSecret,
    initialValue: isSecret ? "" : (envPair.initialValue ?? value),
    currentValue: isSecret ? "" : (envPair.currentValue ?? value),
  };
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

  // The response doesn't include a way to infer the schema version, so it's set to the latest version
  // Any relevant migrations have to be accounted here
  return {
    v: EnvironmentSchemaVersion,
    variables: variables.map(normalizeEnvironmentVariable),
    ...rest,
  };
};

/**
 * Transforms workspace collection data to the `HoppCollection` format.
 *
 * @param {WorkspaceCollection[]} collections - An array of workspace collection objects to be transformed.
 * @returns {HoppCollection[]} The transformed array of collections conforming to the `HoppCollection` type.
 */
export const transformWorkspaceCollections = (
  collections: WorkspaceCollection[]
): HoppCollection[] => {
  return collections.map((collection) => {
    const { id, title, data, requests, folders } = collection;

    const parsedData: { auth?: HoppRESTAuth; headers?: HoppRESTHeaders } = data
      ? JSON.parse(data)
      : {};

    const { auth = { authType: "inherit", authActive: true }, headers = [] } =
      parsedData;

    const migratedAuth: HoppRESTAuth =
      auth.authType === "oauth-2"
        ? {
            ...auth,
            grantTypeInfo:
              auth.grantTypeInfo.grantType === "CLIENT_CREDENTIALS"
                ? {
                    ...auth.grantTypeInfo,
                    clientAuthentication: "IN_BODY",
                  }
                : auth.grantTypeInfo,
          }
        : auth;

    const migratedHeaders = headers.map((header) =>
      header.description ? header : { ...header, description: "" }
    );

    // The response doesn't include a way to infer the schema version, so it's set to the latest version
    // Any relevant migrations have to be accounted here
    // `ref_id` field isn't necessary being applicable only to personal workspace and asociates with syncing
    return {
      v: CollectionSchemaVersion,
      id,
      name: title,
      folders: transformWorkspaceCollections(folders),
      requests: transformWorkspaceRequests(requests),
      auth: migratedAuth,
      headers: migratedHeaders,
    };
  });
};
