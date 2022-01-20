import {
  HoppRESTRequest,
  translateToNewRequest,
} from "@hoppscotch/data";

export interface Collection<T extends HoppRESTRequest> {
  v: number;
  name: string;
  folders: Collection<T>[];
  requests: T[];

  id?: string; // For Firestore ID
}

export function makeCollection<T extends HoppRESTRequest>(
  x: Omit<Collection<T>, "v">
): Collection<T> {
  return {
    v: 1,
    ...x,
  };
}

/**
 * Translating the older version of collections to the newer version
 * @param x The collection JSON object to be parsed
 * @returns The parsed collection object
 */
export function translateToNewRESTCollection(
  x: any
): Collection<HoppRESTRequest> {
  if (x.v && x.v === 1) return x;

  // Legacy
  const name = x.name ?? "Untitled";
  const folders = (x.folders ?? []).map(translateToNewRESTCollection);
  const requests = (x.requests ?? []).map(translateToNewRequest);

  const obj = makeCollection<HoppRESTRequest>({
    name,
    folders,
    requests,
  });

  if (x.id) obj.id = x.id;

  return obj;
}

/**
 * Typeguard to check valid Hoppscotch Collection JSON
 * @param x The object to be checked
 * @returns Boolean value corresponding to the validity check
 */
function isRESTRequest(param: { x: any }): param is { x: HoppRESTRequest } {
  if (!param.x || typeof param.x !== "object") return false;
  if (!param.x.v) {
    param.x = translateToNewRequest(param.x);
  }
  const entries = [
    "name",
    "method",
    "endpoint",
    "preRequestScript",
    "testScript",
  ];
  for (const y of entries) {
    if (typeof param.x[y] !== "string") return false;
  }
  const testParamOrHeader = (y: any) => {
    if (typeof y.key !== "string") return false;
    if (typeof y.value !== "string") return false;
    if (typeof y.active !== "boolean") return false;
    return true;
  };
  if (!Array.isArray(param.x.params)) {
    return false;
  } else {
    const checkParams = (param.x.params as any[]).every(testParamOrHeader);
    if (!checkParams) return false;
  }
  if (!Array.isArray(param.x.headers)) {
    return false;
  } else {
    const checkHeaders = (param.x.headers as any[]).every(testParamOrHeader);
    if (!checkHeaders) return false;
  }
  if (!param.x.auth || typeof param.x.auth !== "object") {
    return false;
  } else {
    if (typeof param.x.auth.authActive !== "boolean") return false;
    if (!param.x.auth.authType || typeof param.x.auth.authType !== "string") {
      return false;
    } else {
      switch (param.x.auth.authType) {
        case "basic": {
          if (
            !param.x.auth.username ||
            typeof param.x.auth.username !== "string"
          )
            return false;
          if (
            !param.x.auth.password ||
            typeof param.x.auth.password !== "string"
          )
            return false;
          break;
        }
        case "bearer": {
          if (!param.x.auth.token || typeof param.x.auth.token !== "string")
            return false;
          break;
        }
        case "oauth-2": {
          const entries = [
            "token",
            "oidcDiscoveryURL",
            "authURL",
            "accessTokenURL",
            "clientID",
            "scope",
          ];
          for (const y of entries) {
            if (!param.x.auth[y] || typeof param.x.auth[y] !== "string")
              return false;
          }
          break;
        }
        case "none": {
          break;
        }
        default: {
          return false;
        }
      }
    }
  }
  if (!param.x.body || typeof param.x.body !== "object") {
    return false;
  } else {
    if (typeof param.x.body.contentType === "undefined") return false;
    if (typeof param.x.body.body === "undefined") return false;
  }
  return true;
}

/**
 * Typeguard to check valid Hoppscotch REST Collection
 * @param x The object to be checked
 * @returns Boolean value corresponding to the validity check
 */
export function isRESTCollection(param: {
  x: any;
}): param is { x: Collection<HoppRESTRequest> } {
  if (!param.x) return false;
  if (!param.x.v) {
    param.x = translateToNewRESTCollection(param.x);
  }

  if (!param.x.name || typeof param.x.name !== "string") return false;
  if (!Array.isArray(param.x.requests)) {
    return false;
  } else {
    const checkRequests = [];
    for (const [idx, val] of param.x.requests.entries()) {
      const pm = {
        x: { ...param.x.requests[idx] },
      };
      checkRequests.push(isRESTRequest(pm));
      param.x.requests[idx] = pm.x;
    }
    if (!checkRequests.every((val) => val)) return false;
  }
  if (!Array.isArray(param.x.folders)) {
    return false;
  } else {
    const checkFolders = [];
    for (const [idx, val] of param.x.folders.entries()) {
      const pm = {
        x: { ...param.x.folders[idx] },
      };
      checkFolders.push(isRESTCollection(pm));
      param.x.folders[idx] = pm.x;
    }
    if (!checkFolders.every((val) => val)) return false;
  }
  return true;
}
