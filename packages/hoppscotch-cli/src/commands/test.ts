import { handleError } from "../handlers/error";
import { parseDelayOption } from "../options/test/delay";
import { parseEnvsData } from "../options/test/env";
import { TestCmdOptions, TestCmdEnvironmentOptions } from "../types/commands";
import { HoppEnvs } from "../types/request";
import { isHoppCLIError } from "../utils/checks";
import {
  collectionsRunner,
  collectionsRunnerExit,
  collectionsRunnerResult,
} from "../utils/collections";
import { parseCollectionData } from "../utils/mutators";

export const test = (pathOrId: string, options: TestCmdOptions) => async () => {
  try {
    const delay = options.delay ? parseDelayOption(options.delay) : 0;

    const envs = options.env
      ? await parseEnvsData(options as TestCmdEnvironmentOptions)
      : <HoppEnvs>{ global: [], selected: [] };

    const collections = await parseCollectionData(pathOrId, options);

    const report = await collectionsRunner({ collections, envs, delay });
    const hasSucceeded = collectionsRunnerResult(report);

    collectionsRunnerExit(hasSucceeded);
  } catch (e) {
    if (isHoppCLIError(e)) {
      handleError(e);
      process.exit(1);
    } else throw e;
  }
};
