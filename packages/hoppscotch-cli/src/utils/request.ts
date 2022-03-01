import axios, { Method } from "axios";
import chalk from "chalk";
import { WritableStream } from "table";
import * as S from "fp-ts/string";
import * as E from "fp-ts/Either";
import * as A from "fp-ts/Array";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import { pipe } from "fp-ts/function";
import { clear } from "console";
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data";
import { runPreRequestScript } from "@hoppscotch/js-sandbox";
import {
  GRequest,
  responseErrors,
  getEffectiveRESTRequest,
  getTableResponse,
  getTableStream,
  getTestResponse,
  isHoppCLIError,
} from ".";
import {
  RequestStack,
  RequestConfig,
  RunnerResponseInfo,
  EffectiveHoppRESTRequest,
  TestScriptData,
} from "../interfaces";
import { error, HoppCLIError } from "../types";

// !NOTE: The `config.supported` checks are temporary until OAuth2 and Multipart Forms are supported

/**
 * Takes in a Hoppscotch REST Request, and converts each request to an Axios object
 * @param rootPath The file path
 * @param req Hoppscotch REST Request
 * @returns A stack element of the request stack
 */
const createRequest = (
  rootPath: string,
  req: EffectiveHoppRESTRequest
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
 * The request parser from the collection JSON.
 * @param collection The collection object parsed from the JSON.
 * @param rootPath The folder path.
 * @returns RequestStack[] - Created request-stacks successfully parsed
 * from HoppCollection.
 * HoppCLIError - On error while parsing HoppCollection.
 */
export const requestsParser = (
  collection: HoppCollection<HoppRESTRequest>,
  rootPath: string = "$ROOT"
): TE.TaskEither<HoppCLIError, RequestStack[]> =>
  pipe(
    /**
     * Mapping collection's HoppRESTRequests to EffectiveHoppRESTRequest,
     * then running preRequestScriptRunner over them and mapping output
     * to generate RequestStack[] which is binded to PARSED_REQUESTS.
     */
    collection.requests,
    A.map(
      (hoppRequest) =>
        Object({
          ...hoppRequest,
          effectiveFinalBody: null,
          effectiveFinalHeaders: [],
          effectiveFinalParams: [],
          effectiveFinalURL: S.empty,
        }) as EffectiveHoppRESTRequest
    ),
    A.map(preRequestScriptRunner),
    TE.sequenceArray,
    TE.map(RA.toArray),
    TE.map(
      A.map((effHoppRequest) =>
        createRequest(`${rootPath}/${collection.name}`, effHoppRequest)
      )
    ),
    TE.bindTo("PARSED_REQUESTS"),

    /**
     * Recursive call to requestsParser on collections's folder, the
     * RequestStack[] output concated with PARSED_REQUESTS, and the
     * overall output is binded to FINAL_PARSED_REQUESTS.
     */
    TE.chain(({ PARSED_REQUESTS }) =>
      pipe(
        collection.folders,
        A.map((a) => requestsParser(a, `${rootPath}/${collection.name}`)),
        TE.sequenceArray,
        TE.map(RA.toArray),
        TE.map(A.flatten),
        TE.map(A.concat(PARSED_REQUESTS))
      )
    ),
    TE.bindTo("FINAL_PARSED_REQUESTS"),
    TE.map(({ FINAL_PARSED_REQUESTS }) => FINAL_PARSED_REQUESTS)
  );

const preRequestScriptRunner = (
  request: EffectiveHoppRESTRequest
): TE.TaskEither<HoppCLIError, EffectiveHoppRESTRequest> =>
  pipe(
    TE.of(request),
    TE.map((req) => req.preRequestScript),
    TE.chain((preScript) =>
      runPreRequestScript(preScript, { global: [], selected: [] })
    ),
    TE.map((envs) => Object({ name: "Env", variables: envs.selected })),
    TE.chainW((env) =>
      pipe(getEffectiveRESTRequest(request, env), TE.fromEither)
    ),
    TE.mapLeft((reason) =>
      isHoppCLIError(reason)
        ? reason
        : error({
            code: "PRE_REQUEST_SCRIPT_ERROR",
            name: request.name,
            data: reason,
          })
    )
  );

export const runRequests = (
  requests: RequestStack[]
): TE.TaskEither<HoppCLIError, TestScriptData[]> =>
  pipe(
    TE.tryCatch(
      async () => {
        if (A.isNonEmpty(requests)) {
          const tableStream = getTableStream();
          responseTableOutput.header(tableStream);

          const testScriptData = await pipe(
            requests,
            A.map((request) =>
              pipe(
                request,
                requestRunner,
                T.map((res) => {
                  responseTableOutput.body(res, tableStream);
                  return {
                    name: request.name,
                    testScript: request.testScript,
                    response: getTestResponse(res),
                  } as TestScriptData;
                })
              )
            ),
            T.sequenceArray
          )();

          responseTableOutput.footer();
          return RA.toArray(testScriptData);
        }
        return [];
      },
      (reason) => error({ code: "UNKNOWN_ERROR", data: E.toError(reason) })
    )
  );

const responseTableOutput = {
  header: (tableStream: WritableStream) => {
    clear();
    tableStream.write([
      pipe("PATH", chalk.cyanBright, chalk.bold),
      pipe("METHOD", chalk.cyanBright, chalk.bold),
      pipe("ENDPOINT", chalk.cyanBright, chalk.bold),
      pipe("STATUS CODE", chalk.cyanBright, chalk.bold),
    ]);
  },
  body: (response: RunnerResponseInfo, tableStream: WritableStream) => {
    const tableResponse = getTableResponse(response);
    tableStream.write([
      tableResponse.path,
      tableResponse.method,
      tableResponse.endpoint,
      tableResponse.statusCode,
    ]);
  },
  footer: () => process.stdout.write("\n"),
};
