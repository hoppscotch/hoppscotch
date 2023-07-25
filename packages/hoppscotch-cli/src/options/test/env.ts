import { error } from "../../types/errors";
import { HoppEnvs, HoppEnvPair } from "../../types/request";
import { readJsonFile } from "../../utils/mutators";

/**
 * Parses env json file for given path and validates the parsed env json object.
 * @param path Path of env.json file to be parsed.
 * @param envName Name of the environment that should be used. If undefined first environment is used.
 * @returns For successful parsing we get HoppEnvs object.
 */
export async function parseEnvsData(path: string, envName: string | undefined) {
  const contents = await readJsonFile(path)
  if(!(contents && typeof contents === "object" && Array.isArray(contents))) {
    throw error({ code: "MALFORMED_ENV_FILE", path, data: null })
  }

  const envPairs: Array<HoppEnvPair> = []

  const contentEntries = Object.entries(contents)
  let environmentFound = false;

  for(const [key, obj] of contentEntries) {
    if(!(typeof obj === "object" && "name" in obj && "variables" in obj)) {
      throw error({ code: "MALFORMED_ENV_FILE", path, data: { value: obj } })
    }
    if(envName && envName !== obj.name) {
      continue
    }
    environmentFound = true;
    for(const variable of obj.variables) {
      if(
        !(
          typeof variable === "object" &&
          "key" in variable &&
          "value" in variable &&
          "secret" in variable
        )
      ) {
        throw error({ code: "MALFORMED_ENV_FILE", path, data: { value: variable } });
      }
      const { key, value, secret } = variable;
      envPairs.push({ key: key, value: value, secret: secret });
    }
    break
  }
  if(envName && !environmentFound) {
    throw error({ code: "ENVIRONMENT_NAME_NOT_FOUND", data: envName });
  }
  return <HoppEnvs>{ global: [], selected: envPairs }
}
