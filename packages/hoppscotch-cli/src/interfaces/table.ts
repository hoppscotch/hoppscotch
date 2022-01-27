import { Method } from "axios";

export interface responseTable {
  path: string;
  endpoint: string;
  method: Method;
  statusCode: string;
}
