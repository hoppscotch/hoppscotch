import chalk from "chalk";
import { log } from "console";
import { pipe } from "fp-ts/function";
import { HoppCLIError, HoppErrorCode } from "../types";
import { isSafeCommanderError, parseErrorMessage } from "../utils";

export const handleError = <T extends HoppErrorCode>(
  error: HoppCLIError<T>
) => {
  let ERROR: string = `${error.code}: `;

  switch (error.code) {
    case "FILE_NOT_FOUND":
      ERROR += `File not found for given path: ${error.path}`;
      break;
    case "UNKNOWN_COMMAND":
      ERROR += `Unavailable command: ${error.command}`;
      break;
    case "FILE_NOT_JSON":
      ERROR += `Given file path isn't json type: ${error.path}`;
      break;
    case "MALFORMED_COLLECTION":
      ERROR += `Unable to process given collection file: ${error.path}`;
      break;
    case "NO_FILE_PATH":
      ERROR += `Please provide a hoppscotch-collection file.`;
      break;
    case "UNKNOWN_ERROR":
    case "DEBUGGER_ERROR":
      isSafeCommanderError(error.data);
      ERROR += parseErrorMessage(error.data);
      break;
  }

  pipe(chalk.redBright(ERROR), log);
  process.exit(0);
};
