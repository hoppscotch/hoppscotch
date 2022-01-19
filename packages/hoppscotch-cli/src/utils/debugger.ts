import { createConnection, Socket } from "net";
import { Console } from "console";
import { InspectOptions } from "util";
import chalk from "chalk";

import errors from "./error-codes";
import errorHandler from "./error-handler";

/**
 * @class The TCP socket debugger.
 * @classdesc This kind of debugger is required for CLIs with reactive components since libraries like `inquirer` takes control of the console, so error output is redirected to a virtual console.
 */
class debugging {
  private constructor() {}
  /**
   * Creates an instance of the virtual console, which directs all outputs to a TCP socket
   * @returns `sockClient` The TCP socket client to stream logs
   * @returns `virtualConsole` The virtual console to print into
   */
  private static createInstance(): {
    sockClient: Socket;
    virtualConsole: Console;
  } {
    const sockClient = createConnection({ port: 9999, allowHalfOpen: true });
    const virtualConsole = new Console({
      stdout: sockClient,
      stderr: sockClient,
      colorMode: true,
    });
    sockClient.on("error", () => {
      errorHandler({ name: "Debugger Error!", ...errors.HOPP002 });
    });
    return {
      sockClient,
      virtualConsole,
    };
  }
  /**
   * Log debugging message
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static log(message?: any, ...optionalParams: any[]) {
    const { sockClient, virtualConsole } = debugging.createInstance();
    virtualConsole.log(chalk.greenBright(message, ...optionalParams));
    setTimeout(() => sockClient.destroy(), 50);
  }
  /**
   * Log debugging information in `INFO` level
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static info(message?: any, ...optionalParams: any[]) {
    const { sockClient, virtualConsole } = debugging.createInstance();
    virtualConsole.info(chalk.cyanBright(message, ...optionalParams));
    setTimeout(() => sockClient.destroy(), 50);
  }
  /**
   * Log debugging information in `ERROR` level
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static error(message?: any, ...optionalParams: any[]) {
    const { sockClient, virtualConsole } = debugging.createInstance();
    virtualConsole.error(chalk.redBright(message, ...optionalParams));
    setTimeout(() => sockClient.destroy(), 50);
  }
  /**
   * Log debugging information using `util.inspect()` on objects
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static dir(item: any, option?: InspectOptions) {
    const { sockClient, virtualConsole } = debugging.createInstance();
    virtualConsole.dir(item, option);
    setTimeout(() => sockClient.destroy(), 50);
  }
}

export default debugging;
