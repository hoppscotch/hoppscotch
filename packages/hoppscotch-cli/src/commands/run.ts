import * as TE from "fp-ts/TaskEither";
import { pipe, flow } from "fp-ts/function";
import {
  collectionsRunner,
  collectionsRunnerResult,
} from "../utils/collections";
import { handleError } from "../handlers/error";
import { checkFilePath } from "../utils/checks";
import { parseCollectionData } from "../utils/mutators";

export const run = (path: string) => async () => {
  await pipe(
    path,
    checkFilePath,
    TE.chain(parseCollectionData),
    TE.chainTaskK(collectionsRunner),
    TE.chainFirstW(flow(collectionsRunnerResult, TE.of)),
    TE.mapLeft((e) => {
      handleError(e);
      process.exit(1);
    }),
    TE.map((_) => process.exit(0))
  )();
};
