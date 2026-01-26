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

/**
 * Runs CLI with automatic retry for transient infrastructure failures.
 *
 * IMPORTANT: Only use this for tests that EXPECT SUCCESS.
 * For tests that intentionally test error scenarios (bad URLs, script errors, etc.),
 * use plain `runCLI()` instead to avoid false skips.
 *
 * Retries on:
 * - Low-level network errors (ECONNRESET, DNS timeouts, connection refused)
 * - Service degradation (httpbin.org 5xx)
 * - Response undefined errors from network failures
 *
 * Does NOT retry on:
 * - REQUEST_ERROR alone (could be intentional bad URL)
 * - TEST_SCRIPT_ERROR alone (could be intentional script error)
 */
export const runCLIWithNetworkRetry = async (
  args: string,
  options = {},
  maxAttempts = 2
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await runCLI(args, options);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    // Only detect low-level TCP/DNS errors - these are always transient
    const hasLowLevelNetworkError =
      /ECONNRESET|EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(
        combinedOutput
      );

    // Special case: TEST_SCRIPT_ERROR when response is undefined due to REQUEST_ERROR
    // This is the actual CI failure mode when external services go down
    const hasTestScriptErrorFromNetworkFailure =
      /TEST_SCRIPT_ERROR Script execution failed: TypeError: cannot read property/.test(
        combinedOutput
      ) && /REQUEST_ERROR/.test(combinedOutput);

    // Service degradation
    const hasHttpbin5xx =
      /httpbin\.org is down \(5xx\)|httpbin\.org is down \(503\)/i.test(
        combinedOutput
      );

    // Success - return immediately
    if (!result.error && !hasHttpbin5xx) {
      return result;
    }

    // Not a transient error - return immediately (don't mask real failures)
    if (
      !hasLowLevelNetworkError &&
      !hasHttpbin5xx &&
      !hasTestScriptErrorFromNetworkFailure
    ) {
      return result;
    }

    const extractErrorDetails = (output: string): string => {
      if (/ECONNRESET/i.test(output)) return "ECONNRESET (connection reset)";
      if (/EAI_AGAIN/i.test(output)) return "EAI_AGAIN (DNS timeout)";
      if (/ENOTFOUND/i.test(output)) return "ENOTFOUND (DNS lookup failed)";
      if (/ETIMEDOUT/i.test(output)) return "ETIMEDOUT (connection timeout)";
      if (/ECONNREFUSED/i.test(output))
        return "ECONNREFUSED (connection refused)";
      if (/httpbin\.org is down/i.test(output))
        return "httpbin.org service degradation (5xx)";
      if (/TEST_SCRIPT_ERROR.*cannot read property/i.test(output))
        return "TEST_SCRIPT_ERROR (response undefined - likely REQUEST_ERROR)";
      return "Network failure";
    };

    const errorDetail = extractErrorDetails(combinedOutput);
    const argsPreview =
      args.length > 100 ? `${args.substring(0, 100)}...` : args;

    const isLastAttempt = attempt === maxAttempts - 1;
    if (!isLastAttempt) {
      console.log(
        `⚠️  Network error detected: ${errorDetail}\n   Command: ${argsPreview}\n   Retrying once...`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    console.warn(
      `⚠️  Skipping test after retry exhausted\n` +
        `   Error: ${errorDetail}\n` +
        `   Command: ${argsPreview}\n` +
        `   External services may be unavailable. Test will be skipped to avoid blocking CI.`
    );
    return null;
  }

  throw new Error("Unexpected: retry loop completed without returning");
};
