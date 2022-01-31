import axios, { Method } from "axios";
import { WritableStream } from "table";
import { debugging } from ".";
import { TableResponse, RequestStack, RequestConfig } from "../interfaces";
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data";
import { TestResponse } from "@hoppscotch/js-sandbox/lib/test-runner";
import { RunnerResponseInfo, TestScriptPair } from "../interfaces/table";
import {
  getResponseTable,
  getTestResponse,
  requestRunnerGetters,
} from "./getters";
import { responseErrors } from "./constants";

// !NOTE: The `config.supported` checks are temporary until OAuth2 and Multipart Forms are supported

/**
 * Takes in a Hoppscotch REST Request, and converts each request to an Axios object
 * @param rootPath The file path
 * @param req Hoppscotch REST Request
 * @returns A stack element of the request stack
 */
const createRequest = (
  rootPath: string,
  req: HoppRESTRequest,
  debug: boolean = false
): RequestStack => {
  let config: RequestConfig = {
    supported: true,
  };
  config.url = req.endpoint;
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
  for (const x of req.params) {
    if (x.active) {
      if (!config.params) {
        config.params = {};
      }
      if (x.key) config.params[x.key] = x.value;
    }
  }
  for (const x of req.headers) {
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
        config.data = req.body.body;
        break;
      }
    }
  }
  return {
    path: `${rootPath}/${req.name.length > 0 ? req.name : "Untitled Request"}`,
    request: () => axios(config),
  };
};

/**
 * The request runner to execute the request stack
 * @param x The request stack
 * @returns The response table row
 */
const requestRunner = async (x: RequestStack): Promise<RunnerResponseInfo> => {
  try {
    let status: number;
    const baseResponse = await x.request();
    const config = baseResponse.config;
    const runnerResponse: RunnerResponseInfo = {
      ...baseResponse,
      path: x.path,
      endpoint: requestRunnerGetters.endpoint(config.url),
      method: requestRunnerGetters.method(config.method),
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
      body: "",
      statusText: "",
      status: 0,
      headers: [],
    };

    if (axios.isAxiosError(err)) {
      runnerResponse.method = requestRunnerGetters.method(err.config.method);
      runnerResponse.endpoint = requestRunnerGetters.endpoint(err.config.url);

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
 * @param tableStream The writable stream for the table
 * @param responses Array of TestResponse
 * @param debug Boolean to use debugging session
 * @param rootPath The folder path
 */
const requestsParser = async (
  x: HoppCollection<HoppRESTRequest>,
  tableStream: WritableStream,
  responses: TestScriptPair[],
  debug: boolean = false,
  rootPath: string = "$ROOT"
) => {
  for (const req of x.requests) {
    const parsedReq: RequestStack = createRequest(
      `${rootPath}/${x.name}`,
      req,
      debug
    );
    const res: RunnerResponseInfo = await requestRunner(parsedReq);
    const tableResponse: TableResponse = await getResponseTable(res);
    const testResponse: TestResponse = await getTestResponse(res);

    responses.push({
      name: req.name,
      testScript: req.testScript,
      response: testResponse,
    });

    tableStream.write([
      tableResponse.path,
      tableResponse.method,
      tableResponse.endpoint,
      tableResponse.statusCode,
    ]);
  }
  for (const folder of x.folders) {
    await requestsParser(
      folder,
      tableStream,
      responses,
      debug,
      `${rootPath}/${x.name}`
    );
  }
};

export default requestsParser;
