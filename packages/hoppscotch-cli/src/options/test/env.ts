import isArray from "lodash/isArray";
import { error } from "../../types/errors";
import { HoppEnvs, HoppEnvPair } from "../../types/request";
import { readJsonFile } from "../../utils/mutators";

/**
 * Parses env json file for given path and validates the parsed env json object.
 * @param path Path of env.json file to be parsed.
 * @returns For successful parsing we get HoppEnvs object.
 */
export async function parseEnvsData(path: string) {
  // checkFile(path) read and parse
  // console.log('reading json at', path)
  const contents = await readJsonFile(path)
  // console.log('contents of file', contents)
  if(!(contents && typeof contents === "object" && !isArray(contents))) {
    throw error({ code: "MALFORMED_ENV_FILE", path, data: null })
  }
  const envPairs: Array<HoppEnvPair> = []
  for( const [key,value] of Object.entries(contents)) {
    if(typeof key !== "string") {
      throw error({ code: "MALFORMED_ENV_FILE", path, data: {value: key} })
    }
    if(typeof value !== "string") {
      throw error({ code: "MALFORMED_ENV_FILE", path, data: {value: value} })
    }
    envPairs.push(<HoppEnvPair>{key, value})
  }
  return <HoppEnvs>{ global: [], selected: envPairs }
}
