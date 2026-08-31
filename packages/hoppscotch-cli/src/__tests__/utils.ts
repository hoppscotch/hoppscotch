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

// REQUEST_ERROR and TEST_SCRIPT_ERROR alone are ambiguous (bad-URL tests, script errors).
const TRANSIENT_PATTERN =
  /ECONNRESET|EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i;
const HTTPBIN_5XX_PATTERN =
  /httpbin\.org is down \(5xx\)|httpbin\.org is down \(503\)/i;
// Line-anchored match on request-runner output: METHOD + URL + 5xx/429 status.
// Excludes httpbin.org (intentional /status/500 fixtures exist there) and
// failure-message/XML content (no METHOD prefix at line start).
const EXTERNAL_SERVICE_DEGRADATION_PATTERN =
  /(?:^|\n)\s+(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+https?:\/\/(?:echo\.hoppscotch\.io|hoppscotch\.io|postman-echo\.com)(?:\/\S*)?\s+(?:429|5\d{2})(?:\s|$)/i;
// Co-located REQUEST_ERROR + sandbox script crash from network failure. Matches
// both TEST_SCRIPT_ERROR (test-script phase) and PRE_REQUEST_SCRIPT_ERROR
// (pre-request phase), and both TypeError shape (response undefined from
// REQUEST_ERROR) and FetchError shape (hopp.fetch / pm.sendRequest subrequest).
// REQUEST_ERROR co-occurrence anchor distinguishes network failure from a
// real script bug. No existing fixture asserts against this combined shape.
const TEST_SCRIPT_NETWORK_PATTERN =
  /REQUEST_ERROR[\s\S]{0,500}(?:TEST|PRE_REQUEST)_SCRIPT_ERROR[\s\S]{0,120}Script execution failed:[\s\S]{0,200}(?:TypeError:[\s\S]{0,80}cannot read propert(?:y|ies)|FetchError: Fetch failed)|(?:TEST|PRE_REQUEST)_SCRIPT_ERROR[\s\S]{0,120}Script execution failed:[\s\S]{0,200}(?:TypeError:[\s\S]{0,80}cannot read propert(?:y|ies)|FetchError: Fetch failed)[\s\S]{0,500}REQUEST_ERROR/i;

export type TransientClassification = {
  isTransient: boolean;
  detail: string;
};

export const isTransientCliFailure = (
  output: string
): TransientClassification => {
  const cleaned = trimAnsi(output);
  const hasLowLevelNetworkError = TRANSIENT_PATTERN.test(cleaned);
  const hasHttpbin5xx = HTTPBIN_5XX_PATTERN.test(cleaned);
  const hasExternalServiceDegradation =
    EXTERNAL_SERVICE_DEGRADATION_PATTERN.test(cleaned);
  const hasTestScriptErrorFromNetworkFailure =
    TEST_SCRIPT_NETWORK_PATTERN.test(cleaned);

  const isTransient =
    hasLowLevelNetworkError ||
    hasHttpbin5xx ||
    hasExternalServiceDegradation ||
    hasTestScriptErrorFromNetworkFailure;

  let detail = "Network failure";
  if (/ECONNRESET/i.test(cleaned)) detail = "ECONNRESET (connection reset)";
  else if (/EAI_AGAIN/i.test(cleaned)) detail = "EAI_AGAIN (DNS timeout)";
  else if (/ENOTFOUND/i.test(cleaned)) detail = "ENOTFOUND (DNS lookup failed)";
  else if (/ETIMEDOUT/i.test(cleaned))
    detail = "ETIMEDOUT (connection timeout)";
  else if (/ECONNREFUSED/i.test(cleaned))
    detail = "ECONNREFUSED (connection refused)";
  else if (hasHttpbin5xx) detail = "httpbin.org service degradation (5xx)";
  else if (hasExternalServiceDegradation)
    detail = "external service degradation (5xx/429)";
  else if (hasTestScriptErrorFromNetworkFailure)
    detail = "TEST_SCRIPT_ERROR (response undefined - likely network failure)";

  return { isTransient, detail };
};

// For success-path tests only; error-path tests should call `runCLI` directly to
// avoid masking assertion failures as transient.
export const runCLIWithNetworkRetry = async (
  args: string,
  options = {},
  maxAttempts = 2
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await runCLI(args, options);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    const { isTransient, detail } = isTransientCliFailure(combinedOutput);
    const isLastAttempt = attempt === maxAttempts - 1;

    // CLI exits 0 on httpbin 5xx (guards absorb it); check transient signal too.
    if (!result.error && !isTransient) {
      return result;
    }

    // Non-transient outcome — surface the result so the caller's assertions
    // fire on the real error instead of being masked as a flake skip.
    if (!isTransient) {
      return result;
    }

    if (!isLastAttempt) {
      const argsPreview =
        args.length > 100 ? `${args.substring(0, 100)}...` : args;
      console.log(
        `⚠️  Network error detected: ${detail}\n   Command: ${argsPreview}\n   Retrying once...`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    // Transient on last attempt → skip.
    const argsPreview =
      args.length > 100 ? `${args.substring(0, 100)}...` : args;
    console.warn(
      `⚠️  Skipping test after retry exhausted\n` +
        `   Error: ${detail}\n` +
        `   Command: ${argsPreview}\n` +
        `   External services may be unavailable. Test will be skipped to avoid blocking CI.`
    );
    return null;
  }

  throw new Error("Unexpected: retry loop completed without returning");
};
