import { createConnection, Socket } from "net";
import { Console } from "console";
import { InspectOptions } from "util";
import chalk from "chalk";

/**
 * @class The TCP socket debugger.
 * @classdesc This kind of debugger is required for CLIs with reactive components since libraries like `inquirer` takes control of the console, so error output is redirected to a virtual console.
 */
export class debugging {
  private static _instance: any = null;
  private constructor() {}
  /**
   * Creates an instance of the virtual console, which directs all outputs to a TCP socket
   * @returns `sockClient` The TCP socket client to stream logs
   * @returns `virtualConsole` The virtual console to print into
   */
  private static getInstance(): {
    sockClient: Socket;
    virtualConsole: Console;
  } {
    if (debugging._instance !== null) {
      return debugging._instance;
    }
    const sockClient = createConnection({
      port: 9999,
      allowHalfOpen: false,
      writable: true,
    });
    const virtualConsole = new Console({
      stdout: sockClient,
      stderr: sockClient,
      colorMode: true,
    });
    sockClient.on("error", (e) => {
      debugging.error(e);
    });
    debugging._instance = {
      sockClient,
      virtualConsole,
    };
    return debugging._instance;
  }
  /**
   * Log debugging message
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static log(message?: any, ...optionalParams: any[]) {
    const { virtualConsole } = debugging.getInstance();
    virtualConsole.log(chalk.greenBright(message, ...optionalParams));
  }
  /**
   * Log debugging information in `INFO` level
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static info(message?: any, ...optionalParams: any[]) {
    const { virtualConsole } = debugging.getInstance();
    virtualConsole.info(chalk.cyanBright(message, ...optionalParams));
  }
  /**
   * Log debugging information in `ERROR` level
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static error(message?: any, ...optionalParams: any[]) {
    const { sockClient, virtualConsole } = debugging.getInstance();
    virtualConsole.error(chalk.redBright(message, ...optionalParams));
    setTimeout(() => sockClient.destroy(), 50);
  }
  /**
   * Log debugging information using `util.inspect()` on objects
   * @param message The message
   * @param optionalParams Optional parameters
   */
  public static dir(item: any, option?: InspectOptions) {
    const { virtualConsole } = debugging.getInstance();
    virtualConsole.dir(item, option);
  }
}
