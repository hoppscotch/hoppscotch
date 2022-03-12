import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import { TestReport } from "../interfaces/response";
import { HoppCLIError } from "./errors";

export type FormDataEntry = {
  key: string;
  value: string | Blob;
};

export type HoppEnvs = {
  global: {
    key: string;
    value: string;
  }[];
  selected: {
    key: string;
    value: string;
  }[];
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
};
