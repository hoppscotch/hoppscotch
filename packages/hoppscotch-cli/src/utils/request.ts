import axios, { Method } from "axios";
import { URL } from "url";
import * as S from "fp-ts/string";
import * as A from "fp-ts/Array";
import * as T from "fp-ts/Task";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { HoppRESTRequest } from "@hoppscotch/data";
import { responseErrors } from "./constants";
import { getDurationInSeconds, getMetaDataPairs } from "./getters";
import { testRunner, getTestScriptParams, hasFailedTestCases } from "./test";
import { RequestConfig, EffectiveHoppRESTRequest } from "../interfaces/request";
import { RequestRunnerResponse } from "../interfaces/response";
import { preRequestScriptRunner } from "./pre-request";
import {
  HoppEnvs,
  ProcessRequestParams,
  RequestReport,
} from "../types/request";
import {
  printPreRequestRunner,
  printRequestRunner,
  printTestRunner,
} from "./display";
import { error, HoppCLIError } from "../types/errors";
import { hrtime } from "process";
import { RequestMetrics } from "../types/response";
import { pipe } from "fp-ts/function";

// !NOTE: The `config.supported` checks are temporary until OAuth2 and Multipart Forms are supported

/**
 * Transforms given request data to request-config used by request-runner to
 * perform HTTP request.
 * @param req Effective request data with parsed ENVs.
 * @returns Request config with data realted to HTTP request.
 */
export const createRequest = (req: EffectiveHoppRESTRequest): RequestConfig => {
  const config: RequestConfig = {
    supported: true,
  };
  const { finalBody, finalEndpoint, finalHeaders, finalParams } = getRequest;
  const reqParams = finalParams(req);
  const reqHeaders = finalHeaders(req);
  config.url = finalEndpoint(req);
  config.method = req.method as Method;
  config.params = getMetaDataPairs(reqParams);
  config.headers = getMetaDataPairs(reqHeaders);
  if (req.auth.authActive) {
    switch (req.auth.authType) {
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
    config.headers["Content-Type"] = req.body.contentType;
    switch (req.body.contentType) {
      case "multipart/form-data": {
        // TODO: Parse Multipart Form Data
        // !NOTE: Temporary `config.supported` check
        config.supported = false;
        break;
      }
      default: {
        config.data = finalBody(req);
        break;
      }
    }
  }

  return config;
};

/**
 * Performs http request using axios with given requestConfig axios
 * parameters.
 * @param requestConfig The axios request config.
 * @returns If successfully ran, we get runner-response including HTTP response data.
 * Else, HoppCLIError with appropriate error code & data.
 */
export const requestRunner =
  (
    requestConfig: RequestConfig
  ): TE.TaskEither<HoppCLIError, RequestRunnerResponse> =>
  async () => {
    const start = hrtime();

    try {
      // NOTE: Temporary parsing check for request endpoint.
      requestConfig.url = new URL(requestConfig.url ?? "").toString();

      let status: number;
      const baseResponse = await axios(requestConfig);
      const { config } = baseResponse;
      const runnerResponse: RequestRunnerResponse = {
        ...baseResponse,
        endpoint: getRequest.endpoint(config.url),
        method: getRequest.method(config.method),
        body: baseResponse.data,
        duration: 0,
      };

      // !NOTE: Temporary `config.supported` check
      if ((config as RequestConfig).supported === false) {
        status = 501;
        runnerResponse.status = status;
        runnerResponse.statusText = responseErrors[status];
      }

      const end = hrtime(start);
      const duration = getDurationInSeconds(end);
      runnerResponse.duration = duration;

      return E.right(runnerResponse);
    } catch (e) {
      let status: number;
      const runnerResponse: RequestRunnerResponse = {
        endpoint: "",
        method: "GET",
        body: {},
        statusText: responseErrors[400],
        status: 400,
        headers: [],
        duration: 0,
      };

      if (axios.isAxiosError(e)) {
        runnerResponse.endpoint = e.config.url ?? "";

        if (e.response) {
          const { data, status, statusText, headers } = e.response;
          runnerResponse.body = data;
          runnerResponse.statusText = statusText;
          runnerResponse.status = status;
          runnerResponse.headers = headers;
        } else if ((e.config as RequestConfig).supported === false) {
          status = 501;
          runnerResponse.status = status;
          runnerResponse.statusText = responseErrors[status];
        } else if (e.request) {
          return E.left(error({ code: "REQUEST_ERROR", data: E.toError(e) }));
        }

        const end = hrtime(start);
        const duration = getDurationInSeconds(end);
        runnerResponse.duration = duration;

        return E.right(runnerResponse);
      }

      return E.left(error({ code: "REQUEST_ERROR", data: E.toError(e) }));
    }
  };

/**
 * Getter object methods for request-runner.
 */
const getRequest = {
  method: (value: string | undefined) =>
    value ? (value.toUpperCase() as Method) : "GET",

  endpoint: (value: string | undefined): string => (value ? value : ""),

  finalEndpoint: (req: EffectiveHoppRESTRequest): string =>
    S.isEmpty(req.effectiveFinalURL) ? req.endpoint : req.effectiveFinalURL,

  finalHeaders: (req: EffectiveHoppRESTRequest) =>
    A.isNonEmpty(req.effectiveFinalHeaders)
      ? req.effectiveFinalHeaders
      : req.headers,

  finalParams: (req: EffectiveHoppRESTRequest) =>
    A.isNonEmpty(req.effectiveFinalParams)
      ? req.effectiveFinalParams
      : req.params,

  finalBody: (req: EffectiveHoppRESTRequest) =>
    req.effectiveFinalBody ? req.effectiveFinalBody : req.body.body,
};

/**
 * Processes given request, which includes executing pre-request-script,
 * running request & executing test-script.
 * @param request Request to be processed.
 * @param envs Global + selected envs used by requests with in collection.
 * @returns Updated envs and current request's report.
 */
export const processRequest =
  (
    params: ProcessRequestParams
  ): T.Task<{ envs: HoppEnvs; report: RequestReport }> =>
  async () => {
    const { envs, path, request, delay } = params;

    // Initialising updatedEnvs with given parameter envs, will eventually get updated.
    const result = {
      envs: <HoppEnvs>envs,
      report: <RequestReport>{},
    };

    // Initial value for current request's report with default values for properties.
    const report: RequestReport = {
      path: path,
      tests: [],
      errors: [],
      result: true,
      duration: { test: 0, request: 0, preRequest: 0 },
    };

    // Initial value for effective-request with default values for properties.
    let effectiveRequest = <EffectiveHoppRESTRequest>{
      ...request,
      effectiveFinalBody: null,
      effectiveFinalHeaders: [],
      effectiveFinalParams: [],
      effectiveFinalURL: "",
    };

    // Executing pre-request-script
    const preRequestRes = await preRequestScriptRunner(request, envs)();
    if (E.isLeft(preRequestRes)) {
      printPreRequestRunner.fail();

      // Updating report for errors & current result
      report.errors.push(preRequestRes.left);
      report.result = report.result && false;
    } else {
      // Updating effective-request
      effectiveRequest = preRequestRes.right;
    }

    // Creating request-config for request-runner.
    const requestConfig = createRequest(effectiveRequest);

    printRequestRunner.start(requestConfig);

    // Default value for request-runner's response.
    let _requestRunnerRes: RequestRunnerResponse = {
      endpoint: "",
      method: "GET",
      headers: [],
      status: 400,
      statusText: "",
      body: Object(null),
      duration: 0,
    };
    // Executing request-runner.
    const requestRunnerRes = await delayPromiseFunction<
      E.Either<HoppCLIError, RequestRunnerResponse>
    >(requestRunner(requestConfig), delay);
    if (E.isLeft(requestRunnerRes)) {
      // Updating report for errors & current result
      report.errors.push(requestRunnerRes.left);
      report.result = report.result && false;

      printRequestRunner.fail();
    } else {
      _requestRunnerRes = requestRunnerRes.right;
      report.duration.request = _requestRunnerRes.duration;
      printRequestRunner.success(_requestRunnerRes);
    }

    // Extracting test-script-runner parameters.
    const testScriptParams = getTestScriptParams(
      _requestRunnerRes,
      request,
      envs
    );

    // Executing test-runner.
    const testRunnerRes = await testRunner(testScriptParams)();
    if (E.isLeft(testRunnerRes)) {
      printTestRunner.fail();

      // Updating report with current errors & result.
      report.errors.push(testRunnerRes.left);
      report.result = report.result && false;
    } else {
      const { envs, testsReport, duration } = testRunnerRes.right;
      const _hasFailedTestCases = hasFailedTestCases(testsReport);

      // Updating report with current tests, result and duration.
      report.tests = testsReport;
      report.result = report.result && _hasFailedTestCases;
      report.duration.test = duration;

      // Updating resulting envs from test-runner.
      result.envs = envs;

      // Printing tests-report, when test-runner executes successfully.
      printTestRunner.success(testsReport, duration);
    }

    result.report = report;

    return result;
  };

/**
 * Generates new request without any missing/invalid data using
 * current request object.
 * @param request Hopp rest request to be processed.
 * @returns Updated request object free of invalid/missing data.
 */
export const preProcessRequest = (
  request: HoppRESTRequest
): HoppRESTRequest => {
  const tempRequest = Object.assign({}, request);
  if (!tempRequest.v) {
    tempRequest.v = "1";
  }
  if (!tempRequest.name) {
    tempRequest.name = "Untitled Request";
  }
  if (!tempRequest.method) {
    tempRequest.method = "GET";
  }
  if (!tempRequest.endpoint) {
    tempRequest.endpoint = "";
  }
  if (!tempRequest.params) {
    tempRequest.params = [];
  }
  if (!tempRequest.headers) {
    tempRequest.headers = [];
  }
  if (!tempRequest.preRequestScript) {
    tempRequest.preRequestScript = "";
  }
  if (!tempRequest.testScript) {
    tempRequest.testScript = "";
  }
  if (!tempRequest.auth) {
    tempRequest.auth = { authActive: false, authType: "none" };
  }
  if (!tempRequest.body) {
    tempRequest.body = { contentType: null, body: null };
  }
  return tempRequest;
};

/**
 * Get request-metrics object (stats+duration) based on existence of REQUEST_ERROR code
 * in hopp-errors list.
 * @param errors List of errors to check for REQUEST_ERROR.
 * @param duration Time taken (in seconds) to execute the request.
 * @returns Object containing details of request's execution stats i.e., failed/passed
 * data and duration.
 */
export const getRequestMetrics = (
  errors: HoppCLIError[],
  duration: number
): RequestMetrics =>
  pipe(
    errors,
    A.some(({ code }) => code === "REQUEST_ERROR"),
    (hasReqErrors) =>
      hasReqErrors ? { failed: 1, passed: 0 } : { failed: 0, passed: 1 },
    (requests) => <RequestMetrics>{ requests, duration }
  );

/**
 * A function to execute promises with specific delay in milliseconds.
 * @param func Function with promise with return type T.
 * @param delay TIme in milliseconds to delay function.
 * @returns Promise of type same as func.
 */
export const delayPromiseFunction = <T>(
  func: () => Promise<T>,
  delay: number
): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(func()), delay));
