import inquirer from "inquirer";
import fs from "fs/promises";
import * as E from "fp-ts/Either";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import clone from "lodash/clone";
import { CLIContext, RequestStack } from "../interfaces";
import { FormDataEntry, error, HoppCLIError } from "../types";
import { checkFileURL, isRESTCollection, requestsParser } from ".";
import fuzzyPath from "inquirer-fuzzy-path";
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
inquirer.registerPrompt("fuzzypath", fuzzyPath);

/**
 * Sorts the array based on the sort func.
 * NOTE: Creates a new array, if you don't need ref
 * to original array, use `arrayUnsafeSort` for better perf
 * @param sortFunc Sort function to sort against
 */
export const arraySort =
  <T>(sortFunc: (a: T, b: T) => number) =>
  (arr: T[]) => {
    const newArr = clone(arr);

    newArr.sort(sortFunc);

    return newArr;
  };

/**
 * Equivalent to `Array.prototype.flatMap`
 * @param mapFunc The map function
 * @returns
 */
export const arrayFlatMap =
  <T, U>(mapFunc: (value: T, index: number, arr: T[]) => U[]) =>
  (arr: T[]) =>
    arr.flatMap(mapFunc);

export const tupleToRecord = <
  KeyType extends string | number | symbol,
  ValueType
>(
  tuples: [KeyType, ValueType][]
): Record<KeyType, ValueType> =>
  tuples.length > 0
    ? (Object.assign as any)(...tuples.map(([key, val]) => ({ [key]: val })))
    : {};

export const toFormData = (values: FormDataEntry[]) => {
  const formData = new FormData();

  values.forEach(({ key, value }) => formData.append(key, value));

  return formData;
};

/**
 * Parse options to collect JSON file path, through interactive CLI.
 * @param context The initial CLI context object
 * @returns The parsed absolute file path string
 */
export const parseCLIOptions =
  (context: CLIContext): T.Task<any> =>
  async () => {
    try {
      const { fileUrl }: { fileUrl: string } = await inquirer.prompt([
        {
          type: "fuzzypath",
          name: "fileUrl",
          message: "Enter your Hoppscotch collection.json path:",
          excludePath: (nodePath: string) => nodePath.includes("node_modules"),
          excludeFilter: (nodePath: string) =>
            nodePath == "." || nodePath.startsWith("."),
          itemType: "file",
          suggestOnly: false,
          rootPath: ".",
          depthLimit: 5,
          emptyText: "No results...try searching for some other file!",
        },
      ]);
      const _checkFileURL = await checkFileURL(fileUrl)();
      if (E.isRight(_checkFileURL)) {
        context.path = _checkFileURL.right;
      } else {
        return parseCLIOptions(context)();
      }
    } catch (e) {
      return await parseCLIOptions(context)();
    }
  };

/**
 * Parses provided error message to maintain hopp-error messages.
 * @param e Custom error data.
 * @returns string
 */
export const parseErrorMessage = (e: any) => {
  let msg: string;
  if (e instanceof Error) {
    const x = e as NodeJS.ErrnoException;
    msg = e.message.replace(x.code! + ":", "").replace("error:", "");
  } else {
    msg = e;
  }
  return msg.replace(/\n+$|\s{2,}/g, "").trim();
};

/**
 * Parses collection json file for given path:context.path, and validates
 * the parsed collectiona array.
 * @param context
 * @returns TaskEither<HoppCLIError, HoppCollection<HoppRESTRequest>[]>
 */
export const parseCollectionData =
  (
    context: CLIContext
  ): TE.TaskEither<HoppCLIError, HoppCollection<HoppRESTRequest>[]> =>
  async () => {
    try {
      const collectionArray = JSON.parse(
        (await fs.readFile(context.path!)).toString()
      );

      if (!Array.isArray(collectionArray)) {
        return E.left(
          error({ code: "MALFORMED_COLLECTION", path: context.path! })
        );
      }

      for (const [idx, _] of collectionArray.entries()) {
        const pm = {
          x: { ...collectionArray[idx] },
        };
        const _isRESTCollection = isRESTCollection(pm);
        if (!_isRESTCollection) {
          return E.left(
            error({ code: "MALFORMED_COLLECTION", path: context.path! })
          );
        }
        collectionArray[idx] = pm.x;
      }

      context.collections = collectionArray;
      return E.right(context.collections || []);
    } catch (e) {
      return E.left(error({ code: "UNKNOWN_ERROR", data: E.toError(e) }));
    }
  };

/**
 * Flattens nested requests.
 * @param collectionArray Array of hopp-collection's hopp-rest-request
 * @param debug Debugger mode toggle
 * @returns TE.TaskEither<HoppCLIError<HoppCLIErrorCode>, RequestStack[]>
 */
export const flattenRequests =
  (
    collectionArray: HoppCollection<HoppRESTRequest>[],
    debug: boolean
  ): TE.TaskEither<HoppCLIError, RequestStack[]> =>
  async () => {
    let requests: RequestStack[] = [];
    for (const x of collectionArray) {
      const parsedRequests = await requestsParser(x, debug)();
      if (E.isLeft(parsedRequests)) {
        return parsedRequests;
      }
      requests = [...requests, ...parsedRequests.right];
    }
    return E.right(requests);
  };
