import {
  CollectionSchemaVersion,
  Environment,
  EnvironmentSchemaVersion,
  HoppCollection,
  HoppCollectionVariable,
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
 * Transforms the given `HoppRESTAuth` object to ensure it conforms to the latest
 * OAuth 2.0 authentication structure. Depending on the `grantType` within the
 * `grantTypeInfo` property, this function adds or initializes specific fields
 * such as `clientAuthentication`, `authRequestParams`, `tokenRequestParams`,
 * and `refreshRequestParams` to maintain compatibility with updated schema
 * requirements.
 *
 * - For "CLIENT_CREDENTIALS" grant type, sets `clientAuthentication` to "IN_BODY"
 *   and initializes `tokenRequestParams` and `refreshRequestParams` as empty arrays.
 * - For "AUTHORIZATION_CODE" grant type, initializes `authRequestParams`,
 *   `tokenRequestParams`, and `refreshRequestParams` as empty arrays.
 * - For "PASSWORD" grant type, initializes `tokenRequestParams` and
 *   `refreshRequestParams` as empty arrays.
 * - For "IMPLICIT" grant type, initializes `authRequestParams` and
 *   `refreshRequestParams` as empty arrays.
 *
 * If the `authType` is not "oauth-2", the original `auth` object is returned unchanged.
 *
 * @param {HoppRESTAuth} auth - The authentication object to transform.
 * @returns {HoppRESTAuth} The transformed authentication object with updated grant type information.
 */
const transformAuth = (auth: HoppRESTAuth): HoppRESTAuth => {
  if (auth.authType === "oauth-2") {
    const oldGrantTypeInfo = auth.grantTypeInfo;
    let newGrantTypeInfo = oldGrantTypeInfo;

    // Add clientAuthentication for CLIENT_CREDENTIALS
    if (oldGrantTypeInfo.grantType === "CLIENT_CREDENTIALS") {
      newGrantTypeInfo = {
        ...oldGrantTypeInfo,
        clientAuthentication: "IN_BODY",
        tokenRequestParams: [],
        refreshRequestParams: [],
      };
    } else if (oldGrantTypeInfo.grantType === "AUTHORIZATION_CODE") {
      newGrantTypeInfo = {
        ...oldGrantTypeInfo,
        authRequestParams: [],
        tokenRequestParams: [],
        refreshRequestParams: [],
      };
    } else if (oldGrantTypeInfo.grantType === "PASSWORD") {
      newGrantTypeInfo = {
        ...oldGrantTypeInfo,
        tokenRequestParams: [],
        refreshRequestParams: [],
      };
    } else if (oldGrantTypeInfo.grantType === "IMPLICIT") {
      newGrantTypeInfo = {
        ...oldGrantTypeInfo,
        authRequestParams: [],
        refreshRequestParams: [],
      };
    }

    return {
      ...auth,
      grantTypeInfo: newGrantTypeInfo,
    };
  }

  return auth;
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

    const parsedData: {
      auth?: HoppRESTAuth;
      headers?: HoppRESTHeaders;
      variables: HoppCollectionVariable[];
    } = data ? JSON.parse(data) : {};

    const {
      auth = { authType: "inherit", authActive: true },
      headers = [],
      variables = [],
    } = parsedData;

    const transformedAuth = transformAuth(auth);

    const transformedHeaders = headers.map((header) =>
      header.description ? header : { ...header, description: "" }
    );

    const filteredCollectionVariables = variables.filter(
      (variable) => variable.key.trim() !== ""
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
      auth: transformedAuth,
      headers: transformedHeaders,
      variables: filteredCollectionVariables,
    };
  });
};
