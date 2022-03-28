import * as TE from "fp-ts/TaskEither";
import { pipe, flow } from "fp-ts/function";
import {
  collectionsRunner,
  collectionsRunnerExit,
  collectionsRunnerResult,
} from "../utils/collections";
import { handleError } from "../handlers/error";
import { checkFilePath } from "../utils/checks";
import { parseCollectionData } from "../utils/mutators";

export const test = (path: string) => async () => {
  await pipe(
    path,
    checkFilePath,
    TE.chain(parseCollectionData),
    TE.chainTaskK(collectionsRunner),
    TE.chainW(flow(collectionsRunnerResult, collectionsRunnerExit, TE.of)),
    TE.mapLeft((e) => {
      handleError(e);
      process.exit(1);
    })
  )();
};
