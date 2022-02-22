import chalk from "chalk";
import { log } from "console";
import { HoppError, HoppErrorCode } from "../types";
import { isSafeCommanderError, parseErrorMessage } from "../utils";

const parsePreRequestScriptError = (e: any) => {
  if (typeof e === "object") {
    return e.message;
  }
  return e;
};

export const handleError = <T extends HoppErrorCode>(error: HoppError<T>) => {
  const ERROR_CODE = `${chalk.bgRed.black(error.code)} `;
  let ERROR_MSG;

  switch (error.code) {
    case "FILE_NOT_FOUND":
      ERROR_MSG = `File not found for given path - ${error.path}`;
      break;
    case "UNKNOWN_COMMAND":
      ERROR_MSG = `Unavailable command - ${error.command}`;
      break;
    case "FILE_NOT_JSON":
      ERROR_MSG = `Given file path isn't json type - ${error.path}`;
      break;
    case "MALFORMED_COLLECTION":
      ERROR_MSG = `Unable to process given collection file - ${error.path}`;
      break;
    case "NO_FILE_PATH":
      ERROR_MSG = `Please provide a hoppscotch-collection file.`;
      break;
    case "PARSING_ERROR":
      ERROR_MSG = `Unable to process collection data - ${error.data}`;
      break;
    case "TEST_SCRIPT_ERROR":
      ERROR_MSG = `Failed to run test for request "${error.name}"`;
      break;
    case "PRE_REQUEST_SCRIPT_ERROR":
      ERROR_MSG = `Unable to run pre-request-script - ${parsePreRequestScriptError(
        error.data
      )}`;
      break;
    case "UNKNOWN_ERROR":
    case "DEBUGGER_ERROR":
      isSafeCommanderError(error.data);
      ERROR_MSG = parseErrorMessage(error.data);
      break;
    case "TESTS_FAILING":
      ERROR_MSG = error.data;
      break;
  }

  log(ERROR_CODE + chalk.redBright(ERROR_MSG));
  process.exit(1);
};
