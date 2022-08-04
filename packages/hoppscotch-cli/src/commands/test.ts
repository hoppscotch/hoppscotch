import * as TE from "fp-ts/TaskEither";
import { pipe, flow } from "fp-ts/function";
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

export const test = (path: string, options: TestCmdOptions) => async () => {
  await pipe(
    TE.Do,
    TE.bind("envs", () => parseEnvsData(options.env)),
    TE.bind("collections", () => parseCollectionData(path)),
    TE.bind("delay", () => parseDelayOption(options.delay)),
    TE.chainTaskK(collectionsRunner),
    TE.chainW(flow(collectionsRunnerResult, collectionsRunnerExit, TE.of)),
    TE.mapLeft((e) => {
      handleError(e);
      process.exit(1);
    })
  )();
};
