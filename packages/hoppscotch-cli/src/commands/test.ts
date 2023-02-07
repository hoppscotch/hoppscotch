import {
  collectionsRunner,
  collectionsRunnerExit,
  collectionsRunnerResult,
} from "../utils/collections";
import { handleError } from "../handlers/error";
import { parseCollectionData } from "../utils/mutators";
import { parseEnvsData } from "../options/test/env";
import { TestCmdOptions } from "../types/commands";
import { parseDelayOption } from "../options/test/delay";
import { HoppEnvs } from "../types/request";
import { isHoppCLIError } from "../utils/checks";

export const test = (path: string, options: TestCmdOptions) => async () => {
  try {
    const delay = options.delay ? parseDelayOption(options.delay) : 0
    const envs = options.env ? await parseEnvsData(options.env) : <HoppEnvs>{ global: [], selected: [] }
    const collections = await parseCollectionData(path)

    const report = await collectionsRunner({collections, envs, delay})
    const hasSucceeded = collectionsRunnerResult(report)
    collectionsRunnerExit(hasSucceeded)
  } catch(e) {
    if(isHoppCLIError(e)) {
      handleError(e)
      process.exit(1);
    }
    else throw e
  }
};
