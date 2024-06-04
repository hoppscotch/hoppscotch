import { exec } from "child_process";
import { resolve } from "path";

import { ExecResponse } from "./types";

export const runCLI = (args: string, options = {}): Promise<ExecResponse> => {
  const CLI_PATH = resolve(__dirname, "../../bin/hopp.js");
  const command = `node ${CLI_PATH} ${args}`;

  return new Promise((resolve) =>
    exec(command, options, (error, stdout, stderr) =>
      resolve({ error, stdout, stderr })
    )
  );
};

export const trimAnsi = (target: string) => {
  const ansiRegex =
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

  return target.replace(ansiRegex, "");
};

export const getErrorCode = (out: string) => {
  const ansiTrimmedStr = trimAnsi(out);
  return ansiTrimmedStr.split(" ")[0];
};

export const getTestJsonFilePath = (
  file: string,
  kind: "collection" | "environment"
) => {
  const kindDir = {
    collection: "collections",
    environment: "environments",
  }[kind];

  const filePath = resolve(
    __dirname,
    `../../src/__tests__/e2e/fixtures/${kindDir}/${file}`
  );
  return filePath;
};
