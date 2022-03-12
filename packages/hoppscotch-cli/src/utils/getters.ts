import {
  HoppRESTHeader,
  Environment,
  parseTemplateStringE,
  HoppRESTParam,
} from "@hoppscotch/data";
import chalk from "chalk";
import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import * as S from "fp-ts/string";
import * as O from "fp-ts/Option";
import { error } from "../types/errors";

/**
 * Generates template string (status + statusText) with specific color unicodes
 * based on type of status.
 * @param status Status code of a HTTP response.
 * @param statusText Status text of a HTTP response.
 * @returns Template string with related color unicodes.
 */
export const getColorStatusCode = (
  status: number | string,
  statusText: string
): string => {
  const statusCode = `${status == 0 ? "Error" : status} : ${statusText}`;

  if (status.toString().startsWith("2")) {
    return chalk.greenBright(statusCode);
  } else if (status.toString().startsWith("3")) {
    return chalk.yellowBright(statusCode);
  }

  return chalk.redBright(statusCode);
};

/**
 * Replaces all template-string with their effective ENV values to generate effective
 * request headers/parameters meta-data.
 * @param metaData Headers/parameters on which ENVs will be applied.
 * @param environment Provides ENV variables for parsing template-string.
 * @returns Active, non-empty-key, parsed headers/parameters pairs.
 */
export const getEffectiveFinalMetaData = (
  metaData: HoppRESTHeader[] | HoppRESTParam[],
  environment: Environment
) =>
  pipe(
    metaData,

    /**
     * Selecting only non-empty and active pairs.
     */
    A.filter(({ key, active }) => !S.isEmpty(key) && active),
    A.map(({ key, value }) => ({
      active: true,
      key: parseTemplateStringE(key, environment.variables),
      value: parseTemplateStringE(value, environment.variables),
    })),
    E.fromPredicate(
      /**
       * Check if every key-value is right either. Else return HoppCLIError with
       * appropriate reason.
       */
      A.every(({ key, value }) => E.isRight(key) && E.isRight(value)),
      (reason) => error({ code: "PARSING_ERROR", data: reason })
    ),
    E.map(
      /**
       * Filtering and mapping only right-eithers for each key-value as [string, string].
       */
      A.filterMap(({ key, value }) =>
        E.isRight(key) && E.isRight(value)
          ? O.some({ active: true, key: key.right, value: value.right })
          : O.none
      )
    )
  );

/**
 * Reduces array of HoppRESTParam or HoppRESTHeader to unique key-value
 * pair.
 * @param metaData Array of meta-data to reduce.
 * @returns Object with unique key-value pair.
 */
export const getMetaDataPairs = (
  metaData: HoppRESTParam[] | HoppRESTHeader[]
) =>
  pipe(
    metaData,

    // Excluding non-active & empty key request meta-data.
    A.filter(({ active, key }) => active && !S.isEmpty(key)),

    // Reducing array of request-meta-data to key-value pair object.
    A.reduce(<Record<string, string>>{}, (target, { key, value }) =>
      Object.assign(target, { [`${key}`]: value })
    )
  );

/**
 * Object providing aliases for chalk color properties based on exceptions.
 */
export const exceptionColors = {
  WARN: chalk.yellow,
  INFO: chalk.blue,
  FAIL: chalk.red,
  SUCCESS: chalk.green,
  BG_WARN: chalk.bgYellow,
  BG_FAIL: chalk.bgRed,
  BG_INFO: chalk.bgBlue,
  BG_SUCCESS: chalk.bgGreen,
};
