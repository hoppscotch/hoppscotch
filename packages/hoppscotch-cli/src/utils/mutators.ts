import inquirer from "inquirer";
import fs from "fs/promises";
import { flow, pipe } from "fp-ts/function";
import * as S from "fp-ts/string";
import * as RA from "fp-ts/ReadonlyArray";
import * as E from "fp-ts/Either";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import clone from "lodash/clone";
import { CLIContext, RequestStack } from "../interfaces";
import {
  Environment,
  RawKeyValueEntry,
  FormDataEntry,
  HoppCLIError,
  HoppErrorCode as HEC,
  error,
} from "../types";
import { checkFileURL, isRESTCollection, requestsParser } from ".";
import fuzzyPath from "inquirer-fuzzy-path";
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
inquirer.registerPrompt("fuzzypath", fuzzyPath);

export function parseTemplateString(
  str: string,
  variables: Environment["variables"]
) {
  if (!variables || !str) {
    return str;
  }
  const searchTerm = /<<([^>]*)>>/g; // "<<myVariable>>"
  return decodeURI(encodeURI(str)).replace(
    searchTerm,
    (_, p1) => variables.find((x) => x.key === p1)?.value || ""
  );
}

export function parseBodyEnvVariables(
  body: string,
  env: Environment["variables"]
): string {
  return body.replace(/<<\w+>>/g, (key) => {
    const found = env.find((envVar) => envVar.key === key.replace(/[<>]/g, ""));
    return found ? found.value : key;
  });
}

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

export const parseRawKeyValueEntry = (str: string): RawKeyValueEntry => {
  const trimmed = str.trim();
  const inactive = trimmed.startsWith("#");

  const [key, value] = trimmed.split(":").map(S.trim);

  return {
    key: inactive ? key.replace(/^#+\s*/g, "") : key, // Remove comment hash and early space
    value,
    active: !inactive,
  };
};

export const parseRawKeyValueEntries = flow(
  S.split("\n"),
  RA.filter((x) => x.trim().length > 0), // Remove lines which are empty
  RA.map(parseRawKeyValueEntry),
  RA.toArray
);

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
 * Parse options to collect JSON file path, through interactive CLI
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
        context.path = _checkFileURL.right || "";
      } else {
        return parseCLIOptions(context)();
      }
    } catch (e) {
      return await parseCLIOptions(context)();
    }
  };

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

export const parseCollectionData =
  (
    context: CLIContext
  ): TE.TaskEither<HoppCLIError<HEC>, HoppCollection<HoppRESTRequest>[]> =>
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

      const valid = [];
      for (const [idx, _] of collectionArray.entries()) {
        const pm = {
          x: { ...collectionArray[idx] },
        };
        valid.push(isRESTCollection(pm));
        collectionArray[idx] = pm.x;
      }

      if (valid.every((val) => val)) {
        context.collections = collectionArray;
        return E.right(context.collections || []);
      }

      return E.left(
        error({ code: "MALFORMED_COLLECTION", path: context.path || "" })
      );
    } catch (e) {
      return E.left(error({ code: "UNKNOWN_ERROR", data: E.toError(e) }));
    }
  };

export const flattenRequests = (
  collectionArray: HoppCollection<HoppRESTRequest>[],
  debug: boolean = false
) =>
  pipe(
    TE.tryCatch(
      async () => {
        const requests: RequestStack[] = [];
        for (const x of collectionArray) {
          await requestsParser(x, requests, debug);
        }
        return requests;
      },
      (reason) => error({ code: "UNKNOWN_ERROR", data: E.toError(reason) })
    )
  );
