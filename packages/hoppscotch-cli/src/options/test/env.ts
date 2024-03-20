import { Environment } from "@hoppscotch/data";
import { entityReference } from "verzod";
import { z } from "zod";

import { error } from "../../types/errors";
import {
  HoppEnvKeyPairObject,
  HoppEnvPair,
  HoppEnvs,
} from "../../types/request";
import { readJsonFile } from "../../utils/mutators";

/**
 * Parses env json file for given path and validates the parsed env json object
 * @param path Path of env.json file to be parsed
 * @returns For successful parsing we get HoppEnvs object
 */
export async function parseEnvsData(path: string) {
  const contents = await readJsonFile(path);
  const envPairs: Array<HoppEnvPair | Record<string, string>> = [];

  // The legacy key-value pair format that is still supported
  const HoppEnvKeyPairResult = HoppEnvKeyPairObject.safeParse(contents);

  // Shape of the single environment export object that is exported from the app
  const HoppEnvExportObjectResult = Environment.safeParse(contents);

  // Shape of the bulk environment export object that is exported from the app
  const HoppBulkEnvExportObjectResult = z
    .array(entityReference(Environment))
    .safeParse(contents);

  // CLI doesnt support bulk environments export
  // Hence we check for this case and throw an error if it matches the format
  if (HoppBulkEnvExportObjectResult.success) {
    throw error({ code: "BULK_ENV_FILE", path, data: error });
  }

  //  Checks if the environment file is of the correct format
  // If it doesnt match either of them, we throw an error
  if (
    !HoppEnvKeyPairResult.success &&
    HoppEnvExportObjectResult.type === "err"
  ) {
    throw error({ code: "MALFORMED_ENV_FILE", path, data: error });
  }

  if (HoppEnvKeyPairResult.success) {
    for (const [key, value] of Object.entries(HoppEnvKeyPairResult.data)) {
      envPairs.push({ key, value, secret: false });
    }
  } else if (HoppEnvExportObjectResult.type === "ok") {
    envPairs.push(...HoppEnvExportObjectResult.value.variables);
  }

  return <HoppEnvs>{ global: [], selected: envPairs };
}
