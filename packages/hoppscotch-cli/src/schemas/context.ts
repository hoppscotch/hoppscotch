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
