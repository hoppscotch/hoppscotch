import { error } from "../../types/errors";
import { HoppEnvs, HoppEnvPair } from "../../types/request";
import { readJsonFile } from "../../utils/mutators";

/**
 * Parses env json file for given path and validates the parsed env json object.
 * @param path Path of env.json file to be parsed.
 * @returns For successful parsing we get HoppEnvs object.
 */
export async function parseEnvsData(path: string) {
  const contents = await readJsonFile(path)

  if(!(contents && typeof contents === "object" && !Array.isArray(contents))) {
    throw error({ code: "MALFORMED_ENV_FILE", path, data: null })
  }

  const envPairs: Array<HoppEnvPair> = []

  for( const [key,value] of Object.entries(contents)) {
    if(typeof value !== "string") {
      throw error({ code: "MALFORMED_ENV_FILE", path, data: {value: value} })
    }

    envPairs.push({key, value})
  }
  return <HoppEnvs>{ global: [], selected: envPairs }
}
