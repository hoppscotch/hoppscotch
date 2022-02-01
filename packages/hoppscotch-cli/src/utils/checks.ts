import fs from "fs/promises";
import { join, extname } from "path";
import chalk from "chalk";
import tcpp from "tcp-ping";
import { errors } from ".";
import {
  HoppRESTRequest,
  translateToNewRESTCollection,
  HoppCollection,
  isHoppRESTRequest,
} from "@hoppscotch/data";

/**
 * Typeguard to check valid Hoppscotch REST Collection
 * @param x The object to be checked
 * @returns Boolean value corresponding to the validity check
 */
export function isRESTCollection(param: {
  x: any;
}): param is { x: HoppCollection<HoppRESTRequest> } {
  if (!param.x) return false;
  if (!param.x.v) {
    param.x = translateToNewRESTCollection(param.x);
  }

  if (!param.x.name || typeof param.x.name !== "string") return false;
  if (!Array.isArray(param.x.requests)) {
    return false;
  } else {
    const checkRequests = [];
    for (const [idx, _] of param.x.requests.entries()) {
      const x = {
        ...param.x.requests[idx],
      };
      checkRequests.push(isHoppRESTRequest(x));
      param.x.requests[idx] = x;
    }
    if (!checkRequests.every((val) => val)) return false;
  }
  if (!Array.isArray(param.x.folders)) {
    return false;
  } else {
    const checkFolders = [];
    for (const [idx, _] of param.x.folders.entries()) {
      const pm = {
        x: { ...param.x.folders[idx] },
      };
      checkFolders.push(isRESTCollection(pm));
      param.x.folders[idx] = pm.x;
    }
    if (!checkFolders.every((val) => val)) return false;
  }
  return true;
}

/**
 * Check if the file exists and check the file extension
 * @param url The input file path to check
 * @returns The absolute file URL, if the file exists
 */
export const checkFileURL = async (url: string) => {
  try {
    const fileUrl = join(process.cwd(), url);
    await fs.access(fileUrl);
    if (extname(fileUrl) !== ".json") {
      console.log(
        `${chalk.red(
          ">>"
        )} Selected file is not a collection JSON. Please try again.`
      );
      throw "FileNotJSON";
    }
    return fileUrl;
  } catch (err: any) {
    if (err.code && err.code === "ENOENT") {
      throw errors.HOPP001;
    }
    throw err;
  }
};

/**
 * Checking TCP connection at given port and address exists or not.
 * @param address Address to ping (@default: localhost).
 * @param port Port to ping for given address (@default: 80).
 * @returns Promise<boolean>: True - available, False - unavailable.
 */
export const pingConnection = (
  address: string = "localhost",
  port: number = 80
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    tcpp.ping({ address: address, port: port, attempts: 1 }, (err, data) => {
      if (err) {
        reject(false);
      }

      const pingResultErr = data.results[0].err;
      if (pingResultErr) {
        resolve(false);
      }

      resolve(true);
    });
  });
