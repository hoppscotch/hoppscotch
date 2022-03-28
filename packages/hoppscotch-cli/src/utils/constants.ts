import { ResponseErrorPair } from "../interfaces/response";

export const responseErrors: ResponseErrorPair = {
  501: "REQUEST NOT SUPPORTED",
  408: "NETWORK TIMEOUT",
  400: "BAD REQUEST",
} as const;
