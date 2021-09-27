const knownContentTypes = {
  "application/json": "json",
  "application/ld+json": "json",
  "application/hal+json": "json",
  "application/vnd.api+json": "json",
  "application/xml": "xml",
  "application/x-www-form-urlencoded": "multipart",
  "multipart/form-data": "multipart",
  "text/html": "html",
  "text/plain": "plain",
};

type ValidContentTypes = keyof typeof knownContentTypes;

type HoppRESTAuthNone = {
  authType: "none";
};

type HoppRESTAuthBasic = {
  authType: "basic";

  username: string;
  password: string;
};

type HoppRESTAuthBearer = {
  authType: "bearer";

  token: string;
};

type HoppRESTAuthOAuth2 = {
  authType: "oauth-2";

  token: string;
  oidcDiscoveryURL: string;
  authURL: string;
  accessTokenURL: string;
  clientID: string;
  scope: string;
};

type HoppRESTAuth = { authActive: boolean } & (
  | HoppRESTAuthNone
  | HoppRESTAuthBasic
  | HoppRESTAuthBearer
  | HoppRESTAuthOAuth2
);

const RESTReqSchemaVersion = "1";

type HoppRESTParam = {
  key: string;
  value: string;
  active: boolean;
};

type HoppRESTHeader = {
  key: string;
  value: string;
  active: boolean;
};

type FormDataKeyValue = {
  key: string;
  active: boolean;
} & ({ isFile: true; value: Blob[] } | { isFile: false; value: string });

type HoppRESTReqBodyFormData = {
  contentType: "multipart/form-data";
  body: FormDataKeyValue[];
};

type HoppRESTReqBody =
  | {
      contentType: Exclude<ValidContentTypes, "multipart/form-data">;
      body: string;
    }
  | HoppRESTReqBodyFormData
  | {
      contentType: null;
      body: null;
    };

export interface HoppRESTRequest {
  v: string;
  id?: string; // Firebase Firestore ID

  name: string;
  method: string;
  endpoint: string;
  params: HoppRESTParam[];
  headers: HoppRESTHeader[];
  preRequestScript: string;
  testScript: string;

  auth: HoppRESTAuth;

  body: HoppRESTReqBody;
}

/**
 * Typeguard to check valid Hoppscotch REST Request
 * @param x The object to be checked
 * @returns Boolean value corresponding to the validity check
 */
export function isHoppRESTRequest(x: any): x is HoppRESTRequest {
  return x && typeof x === "object" && "v" in x;
}

/**
 * Parsing old version of request body to the newer version
 * @param x The object to be parsed
 * @returns The parsed request body
 */
function parseRequestBody(x: any): HoppRESTReqBody {
  if (x.contentType === "application/json") {
    return {
      contentType: "application/json",
      body: x.rawParams,
    };
  }

  return {
    contentType: "application/json",
    body: "{}",
  };
}

/**
 * Translating the older version of collection requests to the newer version
 * @param x The request object to be parsed
 * @returns The parsed request object
 */
export function translateToNewRequest(x: any): HoppRESTRequest {
  if (isHoppRESTRequest(x)) {
    return x;
  } else {
    // Old format
    const endpoint: string = `${x.url}${x.path}`;

    const headers: HoppRESTHeader[] = x.headers ?? [];

    // Remove old keys from params
    const params: HoppRESTParam[] = (x.params ?? []).map(
      ({
        key,
        value,
        active,
      }: {
        key: string;
        value: string;
        active: boolean;
      }) => ({
        key,
        value,
        active,
      })
    );

    const name = x.name;
    const method = x.method;

    const preRequestScript = x.preRequestScript;
    const testScript = x.testScript;

    const body = parseRequestBody(x);

    const auth = parseOldAuth(x);

    const result: HoppRESTRequest = {
      name,
      endpoint,
      headers,
      params,
      method,
      preRequestScript,
      testScript,
      body,
      auth,
      v: RESTReqSchemaVersion,
    };

    if (x.id) result.id = x.id;

    return result;
  }
}

/**
 * Parsing old version of request auth to the newer version
 * @param x The object to be parsed
 * @returns The parsed request auth
 */
function parseOldAuth(x: any): HoppRESTAuth {
  if (!x.auth || x.auth === "None")
    return {
      authType: "none",
      authActive: true,
    };

  if (x.auth === "Basic Auth")
    return {
      authType: "basic",
      authActive: true,
      username: x.httpUser,
      password: x.httpPassword,
    };

  if (x.auth === "Bearer Token")
    return {
      authType: "bearer",
      authActive: true,
      token: x.bearerToken,
    };

  return { authType: "none", authActive: true };
}
