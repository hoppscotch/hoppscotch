import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import { TestReport } from "../interfaces/response";
import { HoppCLIError } from "./errors";
import { z } from "zod";

export type FormDataEntry = {
  key: string;
  value: string | Blob;
};

export type HoppEnvPair = { key: string; value: string };

export const HoppEnvArray = z.record(z.string(), z.string());

export type HoppEnvArray = z.infer<typeof HoppEnvArray>;

export const HoppEnvObject = z.object({
  name: z.string(),
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
});

export type HoppEnvObject = z.infer<typeof HoppEnvObject>;

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
