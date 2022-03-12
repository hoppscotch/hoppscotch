import { ResponseErrorPair } from "../interfaces/response";

export const responseErrors: ResponseErrorPair = {
  501: "Request Not Supported",
  408: "Network Timeout",
  600: "Could Not Parse Response",
} as const;
