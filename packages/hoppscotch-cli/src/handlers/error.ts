import chalk from "chalk";
import { CommanderError } from "commander";
import { log } from "console";
import { HoppError, HoppErrorCode } from "../types";
import { parseErrorMessage } from "../utils";

/**
 * Parses error data passed in error object realted to
 * script-errors.
 * @param e Error data to parse.
 * @returns String message appropriately parsed, based on error
 * type.
 */
const parseRequestScriptError = (e: any) => {
  let parsedMsg: string;
  if (typeof e === "object") {
    parsedMsg = e.message || e.data;
  } else if (typeof e == "string") {
    parsedMsg = e;
  } else {
    parsedMsg = JSON.stringify(e);
  }
  return parsedMsg;
};

/**
 * Handles CommanderError to ignore non-zero exitCode errors.
 * In case of exitCode = 0, program immediately exits with 0.
 * @param error Error data to check.
 */
export const handleCommanderError = (error: unknown) => {
  if (error instanceof CommanderError && error.exitCode === 0) {
    process.exit(0);
  }
};

/**
 * Handles HoppError to generate error messages based on data related
 * to error code and exits program with exit code 1.
 * @param error Error object with code of type HoppErrorCode.
 */
export const handleError = <T extends HoppErrorCode>(error: HoppError<T>) => {
  const ERROR_CODE = `${chalk.bgRed.black(error.code)} `;
  let ERROR_MSG;

  switch (error.code) {
    case "FILE_NOT_FOUND":
      ERROR_MSG = `File not found for given path: ${error.path}`;
      break;
    case "UNKNOWN_COMMAND":
      ERROR_MSG = `Unavailable command: ${error.command}`;
      break;
    case "FILE_NOT_JSON":
      ERROR_MSG = `Given file path isn't json type: ${error.path}`;
      break;
    case "MALFORMED_COLLECTION":
      ERROR_MSG = `Unable to process given collection file: ${error.path}`;
      break;
    case "NO_FILE_PATH":
      ERROR_MSG = `Please provide a hoppscotch-collection file.`;
      break;
    case "PARSING_ERROR":
      ERROR_MSG = `Unable to parse - ${error.data}`;
      break;
    case "TEST_SCRIPT_ERROR":
      ERROR_MSG = `Unable to run test-script - "${
        error.name
      }": ${parseRequestScriptError(error.data)}`;
      break;
    case "PRE_REQUEST_SCRIPT_ERROR":
      ERROR_MSG = `Unable to run pre-request-script - "${
        error.name
      }": ${parseRequestScriptError(error.data)}`;
      break;
    case "UNKNOWN_ERROR":
    case "SYNTAX_ERROR":
      handleCommanderError(error.data);
      ERROR_MSG = parseErrorMessage(error.data);
      break;
    case "TESTS_FAILING":
      ERROR_MSG = error.data;
      break;
  }

  log(ERROR_CODE + chalk.redBright(ERROR_MSG));
  process.exit(1);
};
