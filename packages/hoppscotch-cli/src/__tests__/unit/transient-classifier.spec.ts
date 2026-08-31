import { describe, expect, test } from "vitest";

import { isTransientCliFailure } from "../utils";

const RED = "\u001b[31m";
const RESET = "\u001b[0m";

describe("isTransientCliFailure", () => {
  describe("low-level network errors", () => {
    test.each([
      ["ECONNRESET", "read ECONNRESET"],
      ["EAI_AGAIN", "getaddrinfo EAI_AGAIN echo.hoppscotch.io"],
      ["ENOTFOUND", "getaddrinfo ENOTFOUND echo.hoppscotch.io"],
      ["ETIMEDOUT", "connect ETIMEDOUT 104.21.0.1:443"],
      ["ECONNREFUSED", "connect ECONNREFUSED 127.0.0.1:443"],
    ])("classifies %s as transient", (code, output) => {
      const { isTransient } = isTransientCliFailure(output);
      expect(isTransient).toBe(true);
    });

    test("matches ANSI-wrapped error codes", () => {
      const { isTransient } = isTransientCliFailure(
        `${RED}read ECONNRESET${RESET}`
      );
      expect(isTransient).toBe(true);
    });

    test("reports the matched code in detail", () => {
      const { detail } = isTransientCliFailure("read ECONNRESET");
      expect(detail).toBe("ECONNRESET (connection reset)");
    });
  });

  describe("httpbin.org guard messages", () => {
    test.each([
      ["httpbin.org is down (5xx), skipping assertions"],
      ["httpbin.org is down (503), skipping assertions"],
    ])("classifies fixture guard text as transient: %s", (output) => {
      const { isTransient } = isTransientCliFailure(output);
      expect(isTransient).toBe(true);
    });
  });

  describe("external service degradation (runner status lines)", () => {
    test.each([
      ["echo 503", " GET  https://echo.hoppscotch.io  503 : Service Unavailable"],
      ["echo 502", " POST  https://echo.hoppscotch.io/post  502 : Bad Gateway"],
      ["echo 429", " GET  https://echo.hoppscotch.io  429 : Too Many Requests"],
      ["postman-echo 500", " GET  https://postman-echo.com/get  500 : Internal Server Error"],
      ["hoppscotch.io 504", " HEAD  https://hoppscotch.io  504 : Gateway Timeout"],
      ["echo 503 with query-only URL", " GET  https://echo.hoppscotch.io?key=value  503 : Service Unavailable"],
    ])("classifies %s runner line as transient", (_name, line) => {
      const { isTransient } = isTransientCliFailure(`\n${line}\n`);
      expect(isTransient).toBe(true);
    });

    test("matches ANSI-colored status lines", () => {
      const { isTransient } = isTransientCliFailure(
        `\n ${RED}GET${RESET}  https://echo.hoppscotch.io  ${RED}503 : Service Unavailable${RESET}\n`
      );
      expect(isTransient).toBe(true);
    });

    test.each([
      ["httpbin.org excluded (intentional /status fixtures)", " GET  https://httpbin.org/status/503  503 : Service Unavailable"],
      ["4xx is not degradation", " GET  https://echo.hoppscotch.io  404 : Not Found"],
      ["2xx is not degradation", " GET  https://echo.hoppscotch.io  200 : OK"],
      ["mid-line mention is not a runner line", "Request to GET https://echo.hoppscotch.io 500 failed"],
    ])("does not classify: %s", (_name, line) => {
      const { isTransient } = isTransientCliFailure(`\n${line}\n`);
      expect(isTransient).toBe(false);
    });
  });

  describe("script errors caused by request failure", () => {
    const typeErrorCrash =
      "TEST_SCRIPT_ERROR Script execution failed: TypeError: cannot read property 'host' of undefined";
    const preRequestFetchCrash =
      "PRE_REQUEST_SCRIPT_ERROR Script execution failed: FetchError: Fetch failed: socket hang up";
    const requestError = "REQUEST_ERROR socket hang up";

    test("REQUEST_ERROR followed by TypeError crash", () => {
      const { isTransient } = isTransientCliFailure(
        `${requestError}\n${typeErrorCrash}`
      );
      expect(isTransient).toBe(true);
    });

    test("TypeError crash followed by REQUEST_ERROR", () => {
      const { isTransient } = isTransientCliFailure(
        `${typeErrorCrash}\n${requestError}`
      );
      expect(isTransient).toBe(true);
    });

    test("pre-request FetchError with REQUEST_ERROR co-occurrence", () => {
      const { isTransient } = isTransientCliFailure(
        `${requestError}\n${preRequestFetchCrash}`
      );
      expect(isTransient).toBe(true);
    });

    test("script crash alone is not transient (could be a real bug)", () => {
      const { isTransient } = isTransientCliFailure(typeErrorCrash);
      expect(isTransient).toBe(false);
    });

    test("REQUEST_ERROR alone is not transient (could be an intentional bad-URL fixture)", () => {
      const { isTransient } = isTransientCliFailure(
        "REQUEST_ERROR Error: Invalid URL"
      );
      expect(isTransient).toBe(false);
    });

    test("co-occurrence beyond the proximity window is not matched", () => {
      const { isTransient } = isTransientCliFailure(
        `${requestError}\n${"x".repeat(600)}\n${typeErrorCrash}`
      );
      expect(isTransient).toBe(false);
    });
  });

  describe("non-transient shapes stay visible", () => {
    test.each([
      ["clean success output", "✔ All tests passed\nTest Cases: 0 failed 76 passed"],
      ["plain assertion failure", "- Expected '502' to be '200'\nTest Cases: 1 failed 75 passed"],
      ["bare exit-1 with no signal", "Exited with code 1"],
    ])("%s", (_name, output) => {
      const { isTransient } = isTransientCliFailure(output);
      expect(isTransient).toBe(false);
    });
  });
});
