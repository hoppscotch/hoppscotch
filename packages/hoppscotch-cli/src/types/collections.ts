import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import { HoppEnvs } from "./request";

export type CollectionRunnerParam = {
  collections: HoppCollection<HoppRESTRequest>[];
  envs: HoppEnvs;
  delay?: number;
};

export type HoppCollectionFileExt = "json";
