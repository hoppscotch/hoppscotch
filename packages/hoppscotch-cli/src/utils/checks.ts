import {
  HoppCollection,
  HoppRESTRequest,
  isHoppRESTRequest,
} from "@hoppscotch/data";
import * as A from "fp-ts/Array";
import { CommanderError } from "commander";
import { HoppCLIError, HoppErrnoException } from "../types/errors";

/**
 * Determines whether an object has a property with given name.
 * @param target Object to be checked for given property.
 * @param prop Property to be checked in target object.
 * @returns True, if property exists in target object; False, otherwise.
 */
export const hasProperty = <P extends PropertyKey>(
  target: object,
  prop: P
): target is Record<P, unknown> => prop in target;

/**
 * Typeguard to check valid Hoppscotch REST Collection.
 * @param param The object to be checked.
 * @returns True, if unknown parameter is valid Hoppscotch REST Collection;
 * False, otherwise.
 */
export const isRESTCollection = (
  param: unknown
): param is HoppCollection<HoppRESTRequest> => {
  if (!!param && typeof param === "object") {
    if (!hasProperty(param, "v") || typeof param.v !== "number") {
      return false;
    }
    if (!hasProperty(param, "name") || typeof param.name !== "string") {
      return false;
    }
    if (hasProperty(param, "id") && typeof param.id !== "string") {
      return false;
    }
    if (!hasProperty(param, "requests") || !Array.isArray(param.requests)) {
      return false;
    } else {
      // Checks each requests array to be valid HoppRESTRequest.
      const checkRequests = A.every(isHoppRESTRequest)(param.requests);
      if (!checkRequests) {
        return false;
      }
    }
    if (!hasProperty(param, "folders") || !Array.isArray(param.folders)) {
      return false;
    } else {
      // Checks each folder to be valid REST collection.
      const checkFolders = A.every(isRESTCollection)(param.folders);
      if (!checkFolders) {
        return false;
      }
    }

    return true;
  }

  return false;
};


/**
 * Checks if given error data is of type HoppCLIError, based on existence
 * of code property.
 * @param error Error data to check.
 * @returns True, if unknown error validates to be HoppCLIError;
 * False, otherwise.
 */
export const isHoppCLIError = (error: unknown): error is HoppCLIError => {
  return (
    !!error &&
    typeof error === "object" &&
    hasProperty(error, "code") &&
    typeof error.code === "string"
  );
};

/**
 * Checks if given error data is of type HoppErrnoException, based on existence
 * of name property.
 * @param error Error data to check.
 * @returns True, if unknown error validates to be HoppErrnoException;
 * False, otherwise.
 */
export const isHoppErrnoException = (
  error: unknown
): error is HoppErrnoException => {
  return (
    !!error &&
    typeof error === "object" &&
    hasProperty(error, "name") &&
    typeof error.name === "string"
  );
};

/**
 * Check whether given unknown error is instance of commander-error and
 * has zero exit code (which we consider as safe error).
 * @param error Error data to check.
 * @returns True, if error data validates to be safe-commander-error;
 * False, otherwise.
 */
export const isSafeCommanderError = (
  error: unknown
): error is CommanderError => {
  return error instanceof CommanderError && error.exitCode === 0;
};
