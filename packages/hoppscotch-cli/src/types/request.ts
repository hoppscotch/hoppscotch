import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import { TestReport } from "../interfaces/response";
import { HoppCLIError } from "./errors";
import { z } from "zod";

export type FormDataEntry = {
  key: string;
  value: string | Blob;
};

export type HoppEnvPair = { key: string; value: string };

export const HoppEnvKeyPairObject = z.record(z.string(), z.string());

// Shape of the single environment export object that is exported from the app.
export const HoppEnvExportObject = z.object({
  name: z.string(),
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
});

// Shape of the bulk environment export object that is exported from the app.
export const HoppBulkEnvExportObject = z.array(HoppEnvExportObject);

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

export type ProcessRequestParams = {
  request: HoppRESTRequest;
  envs: HoppEnvs;
  path: string;
  delay: number;
};
