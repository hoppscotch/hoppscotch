import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data";

/**
 * * The CLI context object.
 * @property {boolean} interactive - To handle interactive terminal session.
 * @property {string} path - Path to hoppscotch collection.json file.
 * @property {Array<HoppCollection<HoppRESTRequest>>} config - Array of HoppCollection.
 */
export interface CLIContext {
  interactive: boolean;
  path?: string;
  collections?: Array<HoppCollection<HoppRESTRequest>>;
  [x: string]: any;
}

/**
 * * CLI Error object.
 * @property {string} code - Custom error code.
 */
export interface CLIError extends Error {
  code?: string;
}
