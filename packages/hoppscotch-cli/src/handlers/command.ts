import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import {
  checkFilePath,
  flattenRequests,
  parseCollectionData,
  runRequests,
  runTests,
} from "../utils";

export const runCollection = (path: string) =>
  pipe(
    path,
    checkFilePath,
    TE.chain(parseCollectionData),
    TE.chain(flattenRequests),
    TE.chain(runRequests),
    TE.chain(runTests)
  );
