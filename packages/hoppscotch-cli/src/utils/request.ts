import axios, { Method } from "axios";
import chalk from "chalk";
import { WritableStream } from "table";
import * as S from "fp-ts/string";
import * as A from "fp-ts/Array";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { HoppRESTRequest } from "@hoppscotch/data";
import { responseErrors } from "./constants";
import { getTableResponse, getTableStream, getMetaDataPairs } from "./getters";
import {
  testRunner,
  testsReportOutput,
  getTestScriptParams,
  getTestMetrics,
} from "./test";
import {
  RequestStack,
  RequestConfig,
  EffectiveHoppRESTRequest,
} from "../interfaces/request";
import { RequestRunnerResponse } from "../interfaces/response";
import { HoppCLIError } from "../types/errors";
import { TestMetrics } from "../types/response";
import { preRequestScriptRunner } from "./pre-request";
import { HoppEnvs } from "../types/request";

// !NOTE: The `config.supported` checks are temporary until OAuth2 and Multipart Forms are supported

/**
 * Transforms given request data to request-stack which includes axios request-promise,
 * testScript & request's path in collection.
 * @param req Updated Hopp REST request by executing effective request.
 * @returns A ready stack element of the request stack.
 */
export const createRequest = (
  req: EffectiveHoppRESTRequest,
  rootPath: string = "$root"
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
  config.params = getMetaDataPairs(reqParams);
  config.headers = getMetaDataPairs(reqHeaders);
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
    request: () => axios(config),
    path: `${rootPath}/${req.name}`,
  };
};

/**
 * Executes given request-stack returning task consisting of executed
 * axios-request's response.
 * @param requestStack The request stack
 * @returns The response table row
 */
export const requestRunner =
  (requestStack: RequestStack): T.Task<RequestRunnerResponse> =>
  async () => {
    try {
      let status: number;
      const baseResponse = await requestStack.request();
      const { config } = baseResponse;
      const runnerResponse: RequestRunnerResponse = {
        ...baseResponse,
        path: requestStack.path,
        endpoint: getRequest.endpoint(config.url),
        method: getRequest.method(config.method),
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
      const runnerResponse: RequestRunnerResponse = {
        path: requestStack.path,
        endpoint: "",
        method: "GET",
        body: {},
        statusText: "",
        status: 0,
        headers: [],
      };

      if (axios.isAxiosError(err)) {
        runnerResponse.method = getRequest.method(err.config.method);
        runnerResponse.endpoint = getRequest.endpoint(err.config.url);

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
 * Getter object methods for request-runner.
 */
const getRequest = {
  /**
   * Checks and transforms given method to uppercase and defaults to GET
   * if value undefined.
   * @param value HTTP method name.
   * @returns Validated uppercase HTTP method name.
   */
  method: (value: string | undefined) =>
    value ? (value.toUpperCase() as Method) : "GET",

  /**
   * Checks and transforms given endpoint-value and defaults to empty if
   * value undefined.
   * @param value HTTP request endpoint.
   * @returns Validated endpoint as string.
   */
  endpoint: (value: string | undefined): string => (value ? value : ""),
};

/**
 * Processes given request, which includes executing pre-request-script,
 * running request & executing test-script.
 * @param request Request to be processed.
 * @param envs Global + selected envs utilized by requests with in collection.
 * @returns Updated envs and test-metrics.
 */
export const processRequest = (
  request: HoppRESTRequest,
  envs: HoppEnvs,
  rootPath: string
): TE.TaskEither<HoppCLIError, { envs: HoppEnvs; testMetrics: TestMetrics }> =>
  pipe(
    /**
     * Running pre-request-script and returns applied envs on request.
     */
    preRequestScriptRunner(request, envs),

    /**
     * Mapping effective-request from pre-script-runner to generate
     * request-stack.
     */
    TE.map((effRequest) => createRequest(effRequest, rootPath)),

    /**
     * Using request-stack to run non-failing request.
     */
    TE.chainTaskK(requestRunner),

    /**
     * Printing request-runner's response on stdout, with data including
     * METHOD, ENDPOINT, STATUS_CODE + STATUS_TEXT.
     */
    TE.chainFirstW(flow(requestRunnerResponseOutput, TE.of)),

    /**
     * Extracting parameters from request-runner-response to be used in
     * test-runner.
     */
    TE.map((reqRunnerRes) => getTestScriptParams(reqRunnerRes, request, envs)),

    /**
     * Executing test-runner generating tests-report and new envs.
     */
    TE.chainW(testRunner),

    /**
     * Printing details of tests-report on stdout.
     */
    TE.chainFirstW(({ testsReport }) =>
      pipe(testsReport, testsReportOutput, TE.of)
    ),

    /**
     * Mapping returned envs and testsReport to generate envs + testMetrics
     * object.
     */
    TE.map(({ envs, testsReport }) => ({
      envs: envs,
      testMetrics: getTestMetrics(testsReport),
    }))
  );

/**
 * Prints request-runner-response on console in table format.
 * @param response Returned response data from request-runner.
 */
const requestRunnerResponseOutput = (response: RequestRunnerResponse) => {
  const tableStream = getTableStream();
  tableOutput.header(tableStream);
  tableOutput.body(response, tableStream);
  tableOutput.footer();
};

/**
 * Table output object to handle requests & response data console.
 */
const tableOutput = {
  header: (tableStream: WritableStream) => {
    tableStream.write([
      pipe("PATH", chalk.cyanBright, chalk.bold),
      pipe("METHOD", chalk.cyanBright, chalk.bold),
      pipe("ENDPOINT", chalk.cyanBright, chalk.bold),
      pipe("STATUS CODE", chalk.cyanBright, chalk.bold),
    ]);
  },

  body: (response: RequestRunnerResponse, tableStream: WritableStream) => {
    const tableResponse = getTableResponse(response);
    tableStream.write([
      tableResponse.path,
      tableResponse.method,
      tableResponse.endpoint,
      tableResponse.statusCode,
    ]);
  },
  footer: () => {
    process.stdout.write("\n");
  },
};
