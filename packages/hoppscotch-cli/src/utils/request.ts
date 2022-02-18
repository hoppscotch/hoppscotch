import axios, { Method } from "axios";
import * as S from "fp-ts/string";
import * as E from "fp-ts/Either";
import * as A from "fp-ts/Array";
import * as T from "fp-ts/Task";
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data";
import { runPreRequestScript } from "@hoppscotch/js-sandbox/lib";
import { debugging, GRequest, responseErrors } from ".";
import {
  RequestStack,
  RequestConfig,
  RunnerResponseInfo,
  EffectiveHoppRESTRequest,
} from "../interfaces";
import { Environment } from "../types";
import { getEffectiveRESTRequest } from "./getters";
// !NOTE: The `config.supported` checks are temporary until OAuth2 and Multipart Forms are supported

/**
 * Takes in a Hoppscotch REST Request, and converts each request to an Axios object
 * @param rootPath The file path
 * @param req Hoppscotch REST Request
 * @returns A stack element of the request stack
 */
const createRequest = (
  rootPath: string,
  req: EffectiveHoppRESTRequest,
  debug: boolean = false
): RequestStack => {
  const config: RequestConfig = {
    supported: true,
  };
  const reqParams = A.isNonEmpty(req.effectiveFinalParams)
    ? req.effectiveFinalParams
    : req.params;
  const reqHeaders = A.isNonEmpty(req.effectiveFinalHeaders)
    ? req.effectiveFinalHeaders
    : req.headers;
  config.url = S.isEmpty(req.effectiveFinalURL)
    ? req.endpoint
    : req.effectiveFinalURL;
  config.method = req.method as Method;
  if (debug === true) {
    config.transformResponse = [
      (data: any) => {
        debugging.info("new_request");
        debugging.dir(data);
        return data;
      },
    ];
  }
  for (const x of reqParams) {
    if (x.active) {
      if (!config.params) {
        config.params = {};
      }
      if (x.key) config.params[x.key] = x.value;
    }
  }
  for (const x of reqHeaders) {
    if (x.active) {
      if (!config.headers) {
        config.headers = {};
      }
      if (x.key) config.headers[x.key] = x.value;
    }
  }
  if (req.auth.authActive) {
    switch (req.auth.authType) {
      case "bearer": {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers["Authorization"] = `Bearer ${req.auth.token}`;
        break;
      }
      case "basic": {
        config.auth = {
          username: req.auth.username,
          password: req.auth.password,
        };
        break;
      }
      case "oauth-2": {
        // TODO: OAuth2 Request Parsing
        // !NOTE: Temporary `config.supported` check
        config.supported = false;
      }
      default: {
        break;
      }
    }
  }
  if (req.body.contentType) {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers["Content-Type"] = req.body.contentType;
    switch (req.body.contentType) {
      case "multipart/form-data": {
        // TODO: Parse Multipart Form Data
        // !NOTE: Temporary `config.supported` check
        config.supported = false;
        break;
      }
      default: {
        config.data =
          req.effectiveFinalBody !== null
            ? req.effectiveFinalBody
            : req.body.body;
        break;
      }
    }
  }
  return {
    path: `${rootPath}/${req.name.length > 0 ? req.name : "Untitled Request"}`,
    request: () => axios(config),
    name: req.name,
    testScript: req.testScript,
  };
};

/**
 * The request runner to execute the request stack
 * @param x The request stack
 * @returns The response table row
 */
export const requestRunner =
  (x: RequestStack): T.Task<RunnerResponseInfo> =>
  async () => {
    try {
      let status: number;
      const baseResponse = await x.request();
      const { config } = baseResponse;
      const runnerResponse: RunnerResponseInfo = {
        ...baseResponse,
        path: x.path,
        endpoint: GRequest.endpoint(config.url),
        method: GRequest.method(config.method),
        body: baseResponse.data,
      };

      // !NOTE: Temporary `config.supported` check
      if ((config as RequestConfig).supported === false) {
        status = 501;
        runnerResponse.status = status;
        runnerResponse.statusText = responseErrors[status];
      }

      return runnerResponse;
    } catch (err) {
      let status: number;
      let statusText: string;
      const runnerResponse: RunnerResponseInfo = {
        path: x.path,
        endpoint: "",
        method: "GET",
        body: {},
        statusText: "",
        status: 0,
        headers: [],
      };

      if (axios.isAxiosError(err)) {
        runnerResponse.method = GRequest.method(err.config.method);
        runnerResponse.endpoint = GRequest.endpoint(err.config.url);

        // !NOTE: Temporary `config.supported` check
        if ((err.config as RequestConfig).supported === false) {
          status = 501;
          statusText = responseErrors[status];
        } else if (!err.response) {
          status = 408;
          statusText = responseErrors[status];
        } else {
          status = err.response.status;
          statusText = err.response.statusText;
        }
      } else {
        status = 600;
        statusText = responseErrors[status];
      }
      runnerResponse.status = status;
      runnerResponse.statusText = statusText;

      return runnerResponse;
    }
  };

/**
 * The request parser from the collection JSON
 * @param x The collection object parsed from the JSON
 * @param requests Array of requests
 * @param debug Boolean to use debugging session
 * @param rootPath The folder path
 */
export const requestsParser = async (
  x: HoppCollection<HoppRESTRequest>,
  requests: RequestStack[],
  debug: boolean = false,
  rootPath: string = "$ROOT"
) => {
  for (const request of x.requests) {
    let effectiveReq: EffectiveHoppRESTRequest = {
      ...request,
      effectiveFinalBody: null,
      effectiveFinalHeaders: [],
      effectiveFinalParams: [],
      effectiveFinalURL: S.empty,
    };
    effectiveReq = await preRequestScriptRunner(effectiveReq)();
    const createdReq: RequestStack = createRequest(
      `${rootPath}/${x.name}`,
      effectiveReq,
      debug
    );
    requests.push(createdReq);
  }

  for (const folder of x.folders) {
    await requestsParser(folder, requests, debug, `${rootPath}/${x.name}`);
  }
};

const preRequestScriptRunner =
  (request: EffectiveHoppRESTRequest) => async () => {
    if (!S.isEmpty(request.preRequestScript)) {
      const preRequestScriptRes = await runPreRequestScript(
        request.preRequestScript,
        []
      )();

      if (E.isRight(preRequestScriptRes)) {
        const envs: Environment = {
          name: "Env",
          variables: preRequestScriptRes.right,
        };
        return getEffectiveRESTRequest(request, envs);
      }
    }
    return request;
  };
