import axios, { AxiosPromise, AxiosRequestConfig, Method } from "axios";
import chalk from "chalk";
import { WritableStream } from "table";
import { debugging } from "../../utils";
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data";

// !NOTE: The `config.supported` checks are temporary until OAuth2 and Multipart Forms are supported
const notSupported = (
  endpoint: string,
  method: Method,
  path: string
): responseTable => {
  return {
    statusCode: chalk.bold(chalk.redBright("REQUEST NOT SUPPORTED")),
    endpoint,
    method: `${method}: REQUEST_UNSUPPORTED` as Method,
    path,
  };
};
interface requestStack {
  request: () => AxiosPromise<any>;
  path: string;
}

interface responseTable {
  path: string;
  endpoint: string;
  method: Method;
  statusCode: string;
}

interface RequestConfig extends AxiosRequestConfig {
  supported: boolean;
}

/**
 * Takes in a Hoppscotch REST Request, and converts each request to an Axios object
 * @param rootPath The file path
 * @param req Hoppscotch REST Request
 * @returns A stack element of the request stack
 */
const createRequest = (
  rootPath: string,
  req: HoppRESTRequest
): requestStack => {
  let config: RequestConfig = {
    supported: true,
  };
  config.url = req.endpoint;
  config.method = req.method as Method;
  config.transformResponse = [
    (data: any) => {
      debugging.info("new_request");
      debugging.dir(data);
      return data;
    },
  ];
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
const requestRunner = async (x: requestStack): Promise<responseTable> => {
  try {
    const { status, statusText, config } = await x.request();
    // !NOTE: Temporary `config.supported` check
    if ((config as RequestConfig).supported === false) {
      return notSupported(
        config.url!,
        (config.method?.toUpperCase() as Method)!,
        x.path
      );
    }
    return {
      path: x.path,
      method: config.method ? (config.method.toUpperCase() as Method) : "GET",
      endpoint: config.url ? config.url : "",
      statusCode: (() => {
        if (status.toString().startsWith("2")) {
          return chalk.greenBright(`${status} : ${statusText}`);
        } else if (status.toString().startsWith("3")) {
          return chalk.yellowBright(`${status} : ${statusText}`);
        } else {
          return chalk.redBright(`${status} : ${statusText}`);
        }
      })(),
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      // !NOTE: Temporary `config.supported` check
      if ((err.config as RequestConfig).supported === false) {
        return notSupported(
          err.config.url!,
          (err.config.method?.toUpperCase() as Method)!,
          x.path
        );
      }
      let res: responseTable = {
        path: x.path,
        method: err.config.method
          ? (err.config.method.toUpperCase() as Method)
          : "GET",
        endpoint: err.config.url ? err.config.url : "",
        statusCode: "",
      };
      if (!err.response) {
        res.statusCode = chalk.bold(chalk.redBright("ERROR: NETWORK TIMEOUT"));
      } else {
        res.statusCode = (() => {
          if (err.response.status.toString().startsWith("2")) {
            return chalk.greenBright(
              `${err.response.status} : ${err.response.statusText}`
            );
          } else if (err.response.status.toString().startsWith("3")) {
            return chalk.yellowBright(
              `${err.response.status} : ${err.response.statusText}`
            );
          } else {
            return chalk.redBright(
              `${err.response.status} : ${err.response.statusText}`
            );
          }
        })();
      }
      return res;
    } else {
      return {
        path: x.path,
        method: "GET",
        endpoint: "",
        statusCode: chalk.bold(
          chalk.redBright("ERROR: COULD NOT PARSE RESPONSE!")
        ),
      };
    }
  }
};

/**
 * The request parser from the collection JSON
 * @param x The collection object parsed from the JSON
 * @param tableStream The writable stream for the table
 * @param rootPath The folder path
 */
const parseRequests = async (
  x: HoppCollection<HoppRESTRequest>,
  tableStream: WritableStream,
  rootPath: string = "$ROOT"
) => {
  for (const req of x.requests) {
    const parsedReq = createRequest(`${rootPath}/${x.name}`, req);
    const res = await requestRunner(parsedReq);
    tableStream.write([res.path, res.method, res.endpoint, res.statusCode]);
  }
  for (const folder of x.folders) {
    await parseRequests(folder, tableStream, `${rootPath}/${x.name}`);
  }
};

export default parseRequests;
