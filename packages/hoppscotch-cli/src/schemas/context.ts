import { Collection } from "./collection";
import { HoppRESTRequest } from "@hoppscotch/data";

/**
 * * The CLI context object
 */
export interface context {
  interactive: boolean;
  config?: string;
  collections?: Array<Collection<HoppRESTRequest>>;
  [x: string]: any;
}
