import { error } from "../../types/errors";
import { HoppEnvs, HoppEnvPair, HoppEnvObject } from "../../types/request";
import { readJsonFile } from "../../utils/mutators";
/**
 * Parses env json file for given path and validates the parsed env json object.
 * @param path Path of env.json file to be parsed.
 * @returns For successful parsing we get HoppEnvs object.
 */
export async function parseEnvsData(path: string) {
  const contents = await readJsonFile(path);
  const envPairs: Array<HoppEnvPair> = [];
  const HoppEnvPairResult = HoppEnvPair.safeParse(contents);
  const HoppEnvObjectResult = HoppEnvObject.safeParse(contents);

  if (!(HoppEnvPairResult.success || HoppEnvObjectResult.success)) {
    throw error({ code: "MALFORMED_ENV_FILE", path, data: error });
  }

  if (HoppEnvPairResult.success) {
    for (const [key, value] of Object.entries(HoppEnvPairResult.data)) {
      envPairs.push({ key, value });
    }
  } else if (HoppEnvObjectResult.success) {
    const key = HoppEnvObjectResult.data.variables[0].key;
    const value = HoppEnvObjectResult.data.variables[0].value;
    envPairs.push({ key, value });
  }

  return <HoppEnvs>{ global: [], selected: envPairs };
}
