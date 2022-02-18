type HoppErrorPath = {
  path: string;
};

type HoppErrorCmd = {
  command: string;
};

type HoppErrorData = {
  data: any;
};

type HoppErrors = {
  UNKNOWN_ERROR: HoppErrorData;
  FILE_NOT_FOUND: HoppErrorPath;
  UNKNOWN_COMMAND: HoppErrorCmd;
  MALFORMED_COLLECTION: HoppErrorPath;
  FILE_NOT_JSON: HoppErrorPath;
  DEBUGGER_ERROR: HoppErrorData;
  NO_FILE_PATH: {};
};

export type HoppErrorCode = keyof HoppErrors;
export type HoppCLIError<T extends HoppErrorCode> = T extends null
  ? { code: T }
  : { code: T } & HoppErrors[T];

export const error = <T extends HoppErrorCode>(error: HoppCLIError<T>) => error;
