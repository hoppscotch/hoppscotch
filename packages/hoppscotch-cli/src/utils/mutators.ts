import { Environment } from "../interfaces";
import { flow } from "fp-ts/function";
import * as S from "fp-ts/string";
import * as RA from "fp-ts/ReadonlyArray";
import clone from "lodash/clone";
import { RawKeyValueEntry, FormDataEntry } from "../interfaces";

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
