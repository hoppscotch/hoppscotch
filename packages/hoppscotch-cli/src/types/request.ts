import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import { TestReport } from "../interfaces/response";
import { HoppCLIError } from "./errors";

export type FormDataEntry = {
  key: string;
  value: string | Blob;
};

export type HoppEnvPair = { key: string; value: string };

export type HoppEnvs = {
  global: HoppEnvPair[];
  selected: HoppEnvPair[];
};

export type CollectionStack = {
  path: string;
  collection: HoppCollection<HoppRESTRequest>;
};

export type RequestReport = {
  path: string;
  tests: TestReport[];
  errors: HoppCLIError[];
  result: boolean;
  duration: { test: number; request: number; preRequest: number };
};
