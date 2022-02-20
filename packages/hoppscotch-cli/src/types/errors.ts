type HoppErrorPath = {
  path: string;
};

type HoppErrorCmd = {
  command: string;
};

type HoppErrorData = {
  data: any;
};

type HoppErrorTest = {
  name: string;
} & HoppErrorData;

type HoppErrors = {
  UNKNOWN_ERROR: HoppErrorData;
  FILE_NOT_FOUND: HoppErrorPath;
  UNKNOWN_COMMAND: HoppErrorCmd;
  MALFORMED_COLLECTION: HoppErrorPath;
  FILE_NOT_JSON: HoppErrorPath;
  DEBUGGER_ERROR: HoppErrorData;
  NO_FILE_PATH: {};
  PRE_REQUEST_SCRIPT_ERROR: HoppErrorData;
  PARSING_ERROR: HoppErrorData;
  TEST_SCRIPT_ERROR: HoppErrorTest;
  TESTS_FAILING: HoppErrorData;
};

export type HoppErrorCode = keyof HoppErrors;
export type HoppError<T extends HoppErrorCode> = T extends null
  ? { code: T }
  : { code: T } & HoppErrors[T];

export const error = <T extends HoppErrorCode>(error: HoppError<T>) => error;
export type HoppCLIError = HoppError<HoppErrorCode>;
