import { error } from "../../types/errors";
import {
  HoppEnvs,
  HoppEnvPair,
  HoppEnvKeyPairObject,
  HoppEnvExportObject,
  HoppBulkEnvExportObject,
} from "../../types/request";
import { readJsonFile } from "../../utils/mutators";
/**
 * Parses env json file for given path and validates the parsed env json object.
 * @param path Path of env.json file to be parsed.
 * @returns For successful parsing we get HoppEnvs object.
 */
export async function parseEnvsData(path: string) {
  const contents = await readJsonFile(path);
  const envPairs: Array<HoppEnvPair> = [];
  const HoppEnvKeyPairResult = HoppEnvKeyPairObject.safeParse(contents);
  const HoppEnvExportObjectResult = HoppEnvExportObject.safeParse(contents);
  const HoppBulkEnvExportObjectResult =
    HoppBulkEnvExportObject.safeParse(contents);

  // CLI doesnt support bulk environments export.
  // Hence we check for this case and throw an error if it matches the format.
  if (HoppBulkEnvExportObjectResult.success) {
    throw error({ code: "BULK_ENV_FILE", path, data: error });
  }

  //  Checks if the environment file is of the correct format.
  // If it doesnt match either of them, we throw an error.
  if (!(HoppEnvKeyPairResult.success || HoppEnvExportObjectResult.success)) {
    throw error({ code: "MALFORMED_ENV_FILE", path, data: error });
  }

  if (HoppEnvKeyPairResult.success) {
    for (const [key, value] of Object.entries(HoppEnvKeyPairResult.data)) {
      envPairs.push({ key, value });
    }
  } else if (HoppEnvExportObjectResult.success) {
    const { key, value } = HoppEnvExportObjectResult.data.variables[0];
    envPairs.push({ key, value });
  }

  return <HoppEnvs>{ global: [], selected: envPairs };
}
