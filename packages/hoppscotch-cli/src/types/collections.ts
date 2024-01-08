import { HoppCollection } from "@hoppscotch/data";
import { HoppEnvs } from "./request";

export type CollectionRunnerParam = {
  collections: HoppCollection[];
  envs: HoppEnvs;
  delay?: number;
};

export type HoppCollectionFileExt = "json";
