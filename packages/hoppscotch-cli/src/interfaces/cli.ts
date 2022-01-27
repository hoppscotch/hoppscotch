import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data";

/**
 * * The CLI context object
 */
export interface context {
  interactive: boolean;
  config?: string;
  collections?: Array<HoppCollection<HoppRESTRequest>>;
  [x: string]: any;
}

/**
 * * CLI Error object
 */
export interface CLIError extends Error {
  code?: string;
}
