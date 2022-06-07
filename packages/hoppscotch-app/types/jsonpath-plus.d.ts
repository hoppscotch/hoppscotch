import { JSONPathOptions } from "jsonpath-plus"

declare module "jsonpath-plus" {
  export type JSONPathType = (options: JSONPathOptions) => unknown
  export const JSONPath: JSONPathType
}
