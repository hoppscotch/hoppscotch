import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import fs from "fs/promises";
import { entityReference } from "verzod";
import { z } from "zod";

import { error } from "../types/errors";
import { FormDataEntry } from "../types/request";
import { isHoppErrnoException } from "./checks";

/**
 * Parses array of FormDataEntry to FormData.
 * @param values Array of FormDataEntry.
 * @returns FormData with key-value pair from FormDataEntry.
 */
export const toFormData = (values: FormDataEntry[]) => {
  const formData = new FormData();

  values.forEach(({ key, value }) => formData.append(key, value));

  return formData;
};

/**
 * Parses provided error message to maintain hopp-error messages.
 * @param e Custom error data.
 * @returns Parsed error message without extra spaces.
 */
export const parseErrorMessage = (e: unknown) => {
  let msg: string;
  if (isHoppErrnoException(e)) {
    msg = e.message.replace(e.code! + ":", "").replace("error:", "");
  } else if (typeof e === "string") {
    msg = e;
  } else {
    msg = JSON.stringify(e);
  }
  return msg.replace(/\n+$|\s{2,}/g, "").trim();
};

export async function readJsonFile(path: string): Promise<unknown> {
  if (!path.endsWith(".json")) {
    throw error({ code: "INVALID_FILE_TYPE", data: path });
  }

  try {
    await fs.access(path);
  } catch (e) {
    throw error({ code: "FILE_NOT_FOUND", path: path });
  }

  try {
    return JSON.parse((await fs.readFile(path)).toString());
  } catch (e) {
    throw error({ code: "UNKNOWN_ERROR", data: e });
  }
}

/**
 * Parses collection json file for given path:context.path, and validates
 * the parsed collectiona array.
 * @param path Collection json file path.
 * @returns For successful parsing we get array of HoppCollection,
 */
export async function parseCollectionData(
  path: string
): Promise<HoppCollection[]> {
  let contents = await readJsonFile(path);

  const maybeArrayOfCollections: unknown[] = Array.isArray(contents)
    ? contents
    : [contents];

  const collectionSchemaParsedResult = z
    .array(entityReference(HoppCollection))
    .safeParse(maybeArrayOfCollections);

  if (!collectionSchemaParsedResult.success) {
    throw error({
      code: "MALFORMED_COLLECTION",
      path,
      data: "Please check the collection data.",
    });
  }

  return collectionSchemaParsedResult.data.map((collection) => {
    const requestSchemaParsedResult = z
      .array(entityReference(HoppRESTRequest))
      .safeParse(collection.requests);

    if (!requestSchemaParsedResult.success) {
      throw error({
        code: "MALFORMED_COLLECTION",
        path,
        data: "Please check the collection data.",
      });
    }

    return {
      ...collection,
      requests: requestSchemaParsedResult.data,
    };
  });
}
