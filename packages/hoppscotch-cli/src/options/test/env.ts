import { error } from "../../types/errors";
import {
  HoppEnvs,
  HoppEnvPair,
  HoppEnvArray,
  HoppEnvObject,
  HoppBulkEnvObject,
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
  const HoppEnvArrayResult = HoppEnvArray.safeParse(contents);
  const HoppEnvObjectResult = HoppEnvObject.safeParse(contents);
  const HoppBulkEnvObjectResult = HoppBulkEnvObject.safeParse(contents);

  // CLI doesnt support bulk environments export.
  // Hence we check for this case and throw an error if it matches the format.
  if (HoppBulkEnvObjectResult.success) {
    throw error({ code: "MALFORMED_BULK_ENV_FILE", path, data: error });
  }

  //  Checks if the environment file is of the correct format.
  // If it doesnt match either of them, we throw an error.
  if (!(HoppEnvArrayResult.success || HoppEnvObjectResult.success)) {
    throw error({ code: "MALFORMED_ENV_FILE", path, data: error });
  }

  if (HoppEnvArrayResult.success) {
    for (const [key, value] of Object.entries(HoppEnvArrayResult.data)) {
      envPairs.push({ key, value });
    }
  } else if (HoppEnvObjectResult.success) {
    const { key, value } = HoppEnvObjectResult.data.variables[0];
    envPairs.push({ key, value });
  }

  return <HoppEnvs>{ global: [], selected: envPairs };
}
