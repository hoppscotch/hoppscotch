import chalk from "chalk";
import { errors } from "../utils";
import { CommanderError } from "commander";
import { CLIError } from "../interfaces";

/**
 * The all-catch generic error handler, it catches all errors, custom and generic, generated during the CLI execution
 * @param err The error object, it can be a custom error or an error thrown by `Commander.js`
 */
const errorHandler = (err: CLIError | CommanderError) => {
  if (err instanceof CommanderError) {
    if (err.exitCode === 0) {
      process.exit(0);
    }
    console.log(
      `${chalk.red(`${chalk.bold(`ERROR:`)} ${err.message.slice(7)}`)}`
    );
  } else if (err.code && err.code.startsWith("HOPP")) {
    console.log(
      `${chalk.red(`${chalk.bold(`ERROR [${err.code}]:`)} ${err.message}`)}`
    );
  } else {
    console.log(
      `${chalk.red(
        `${chalk.bold(`ERROR [${errors.HOPP000.code}]:`)} ${
          errors.HOPP000.message
        }`
      )}`
    );
    console.log(chalk.yellow(err.name));
    console.log(chalk.yellow(err.message));
    console.log(chalk.yellow(err.stack));
  }
};

export default errorHandler;
