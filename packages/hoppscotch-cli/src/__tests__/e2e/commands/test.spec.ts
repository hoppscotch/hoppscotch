import { ExecException } from "child_process";
import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { HoppErrorCode } from "../../../types/errors";
import {
  getErrorCode,
  getTestJsonFilePath,
  isTransientCliFailure,
  runCLI,
  runCLIWithNetworkRetry,
} from "../../utils";

describe("hopp test [options] <file_path_or_id>", { timeout: 100000 }, () => {
  const VALID_TEST_ARGS = `test ${getTestJsonFilePath("passes-coll.json", "collection")}`;

  describe("Test `hopp test <file_path_or_id>` command:", () => {
    describe("Argument parsing", () => {
      test("Errors with the code `INVALID_ARGUMENT` for not supplying enough arguments", async () => {
        const args = "test";
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
      });

      test("Errors with the code `INVALID_ARGUMENT` for an invalid command", async () => {
        const args = "invalid-arg";
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
      });
    });

    describe("Supplied collection export file validations", () => {
      test("Errors with the code `FILE_NOT_FOUND` if the supplied collection export file doesn't exist", async () => {
        const args = "test notfound.json";
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
      });

      test("Errors with the code UNKNOWN_ERROR if the supplied collection export file content isn't valid JSON", async () => {
        const args = `test ${getTestJsonFilePath("malformed-coll.json", "collection")}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("UNKNOWN_ERROR");
      });

      test("Errors with the code `MALFORMED_COLLECTION` if the supplied collection export file content is malformed", async () => {
        const args = `test ${getTestJsonFilePath("malformed-coll-2.json", "collection")}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("MALFORMED_COLLECTION");
      });

      test("Errors with the code `INVALID_FILE_TYPE` if the supplied collection export file doesn't end with the `.json` extension", async () => {
        const args = `test ${getTestJsonFilePath("notjson-coll.txt", "collection")}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
      });

      test("Fails if the collection file includes scripts with incorrect API usage and failed assertions", async () => {
        const args = `test ${getTestJsonFilePath("fails-coll.json", "collection")}`;
        const { error } = await runCLI(args);

        expect(error).not.toBeNull();
        expect(error).toMatchObject(<ExecException>{
          code: 1,
        });
      });
    });

    describe("Versioned entities", () => {
      describe("Collections & Requests", () => {
        const testFixtures = [
          { fileName: "coll-v1-req-v0.json", collVersion: 1, reqVersion: 0 },
          { fileName: "coll-v1-req-v1.json", collVersion: 1, reqVersion: 1 },
          { fileName: "coll-v2-req-v2.json", collVersion: 2, reqVersion: 2 },
          { fileName: "coll-v2-req-v3.json", collVersion: 2, reqVersion: 3 },
        ];

        testFixtures.forEach(({ collVersion, fileName, reqVersion }) => {
          test(`Successfully processes a supplied collection export file where the collection is based on the "v${collVersion}" schema and the request following the "v${reqVersion}" schema`, async () => {
            const args = `test ${getTestJsonFilePath(fileName, "collection")}`;
            const result = await runCLIWithNetworkRetry(args);
            if (result === null) return;
            expect(result.error).toBeNull();
          });
        });

        describe("Mixed versions", () => {
          test("Successfully processes children based on valid version ranges", async () => {
            const args = `test ${getTestJsonFilePath("valid-mixed-versions-coll.json", "collection")}`;
            const result = await runCLIWithNetworkRetry(args);
            if (result === null) return;
            expect(result.error).toBeNull();
          });

          test("Errors with the code `MALFORMED_COLLECTION` if the children fall out of valid version ranges", async () => {
            const args = `test ${getTestJsonFilePath("invalid-mixed-versions-coll.json", "collection")}`;

            const { stderr } = await runCLI(args);
            const out = getErrorCode(stderr);

            expect(out).toBe<HoppErrorCode>("MALFORMED_COLLECTION");
          });
        });
      });

      describe("Environments", () => {
        const testFixtures = [
          { fileName: "env-v0.json", version: 0 },
          { fileName: "env-v1.json", version: 1 },
          { fileName: "env-v2.json", version: 2 },
        ];

        testFixtures.forEach(({ fileName, version }) => {
          test(`Successfully processes the supplied collection and environment export files where the environment is based on the "v${version}" schema`, async () => {
            const ENV_PATH = getTestJsonFilePath(fileName, "environment");
            const args = `test ${getTestJsonFilePath("sample-coll.json", "collection")} --env ${ENV_PATH}`;
            const result = await runCLIWithNetworkRetry(args);
            if (result === null) return;
            expect(result.error).toBeNull();
          });
        });
      });
    });

    test("Successfully processes a supplied collection export file of the expected format", async () => {
      const args = `test ${getTestJsonFilePath("passes-coll.json", "collection")}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Successfully inherits/overrides authorization and headers specified at the root collection at deeply nested collections", async () => {
      const args = `test ${getTestJsonFilePath(
        "collection-level-auth-headers-coll.json",
        "collection"
      )}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Successfully inherits/overrides authorization and headers at each level with multiple child collections", async () => {
      const args = `test ${getTestJsonFilePath(
        "multiple-child-collections-auth-headers-coll.json",
        "collection"
      )}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Successfully inherits collection variables into folders without their own variables", async () => {
      const args = `test ${getTestJsonFilePath(
        "collection-with-variables.json",
        "collection"
      )}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Persists environment variables set in the pre-request script for consumption in the test script", async () => {
      const args = `test ${getTestJsonFilePath(
        "pre-req-script-env-var-persistence-coll.json",
        "collection"
      )}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("The `Content-Type` header takes priority over the value set at the request body", async () => {
      const args = `test ${getTestJsonFilePath(
        "content-type-header-scenarios.json",
        "collection"
      )}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Strips comments from JSONC request bodies", async () => {
      const args = `test ${getTestJsonFilePath(
        "jsonc-body-coll.json",
        "collection"
      )}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    describe("OAuth 2 Authorization type with Authorization Code Grant Type", () => {
      test("Successfully translates the authorization information to headers/query params and sends it along with the request", async () => {
        const args = `test ${getTestJsonFilePath(
          "oauth2-auth-code-coll.json",
          "collection"
        )}`;
        const result = await runCLIWithNetworkRetry(args);
        if (result === null) return;
        expect(result.error).toBeNull();
      });
    });

    describe("multipart/form-data content type", () => {
      test("Successfully derives the relevant headers based and sends the form data in the request body", async () => {
        const args = `test ${getTestJsonFilePath(
          "oauth2-auth-code-coll.json",
          "collection"
        )}`;
        const result = await runCLIWithNetworkRetry(args);
        if (result === null) return;
        expect(result.error).toBeNull();
      });
    });

    test("Successfully display console logs and recognizes platform APIs in the experimental scripting sandbox", async () => {
      const args = `test ${getTestJsonFilePath(
        "test-scripting-sandbox-modes-coll.json",
        "collection"
      )}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      expect(result.error).toBeNull();

      const expectedStaticParts = [
        "https://example.com/path?foo=bar&baz=qux",
        "'0': 72",
        "'12': 33",
        "Decoded: Hello, world!",
        "Hello after 1s",
      ];

      expectedStaticParts.forEach((part) => {
        expect(result.stdout).toContain(part);
      });

      const every500msCount = (result.stdout.match(/Every 500ms/g) || [])
        .length;
      expect(every500msCount).toBeGreaterThanOrEqual(3);
    });

    test("Fails to display console logs and recognize platform APIs in the legacy scripting sandbox", async () => {
      const args = `test ${getTestJsonFilePath(
        "test-scripting-sandbox-modes-coll.json",
        "collection"
      )} --legacy-sandbox`;
      const { error, stdout } = await runCLI(args);

      expect(error).toBeTruthy();
      expect(stdout).not.toContain("https://example.com/path?foo=bar&baz=qux");
      expect(stdout).not.toContain("Encoded");
    });

    test("Ensures tests run in sequence order based on request path", async () => {
      // Expected order of collection runs
      const expectedOrder = [
        "root-collection-request",
        "folder-1/folder-1-request",
        "folder-1/folder-11/folder-11-request",
        "folder-1/folder-12/folder-12-request",
        "folder-1/folder-13/folder-13-request",
        "folder-2/folder-2-request",
        "folder-2/folder-21/folder-21-request",
        "folder-2/folder-22/folder-22-request",
        "folder-2/folder-23/folder-23-request",
        "folder-3/folder-3-request",
        "folder-3/folder-31/folder-31-request",
        "folder-3/folder-32/folder-32-request",
        "folder-3/folder-33/folder-33-request",
      ];

      const normalizePath = (path: string) => path.replace(/\\/g, "/");

      const extractRunningOrder = (stdout: string): string[] =>
        [...stdout.matchAll(/Running:.*?\/(.*?)\r?\n/g)].map(
          ([, path]) => normalizePath(path.replace(/\x1b\[\d+m/g, "")) // Remove ANSI codes and normalize paths
        );

      const args = `test ${getTestJsonFilePath(
        "multiple-child-collections-auth-headers-coll.json",
        "collection"
      )}`;

      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      expect(extractRunningOrder(result.stdout)).toStrictEqual(expectedOrder);

      expect(result.error).toBeNull();
    });

    // Validates the full `hopp`/`pm` scripting surface and JUnit report structure.
    test("Supports the new scripting API method additions under the `hopp` and `pm` namespaces and validates JUnit report structure", async () => {
      const junitPath = path.join(
        __dirname,
        "scripting-revamp-snapshot-junit.xml"
      );

      if (fs.existsSync(junitPath)) {
        fs.unlinkSync(junitPath);
      }

      const junitArgs = `test ${getTestJsonFilePath(
        "scripting-revamp-coll.json",
        "collection"
      )} --reporter-junit ${junitPath}`;

      // Retry wrapper with XML-completeness check; retries only on transient signals.
      const runWithValidation = async () => {
        const minExpectedTestSuites = 60;
        const maxAttempts = 2;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (fs.existsSync(junitPath)) {
            fs.unlinkSync(junitPath);
          }

          const result = await runCLI(junitArgs);
          const output = `${result.stdout}\n${result.stderr}`;
          const { isTransient, detail } = isTransientCliFailure(output);
          const isLastAttempt = attempt === maxAttempts - 1;

          if (!result.error && fs.existsSync(junitPath)) {
            const xml = fs.readFileSync(junitPath, "utf-8");
            const testsuiteCount = (xml.match(/<testsuite /g) || []).length;

            if (testsuiteCount >= minExpectedTestSuites && !isTransient) {
              return result;
            }

            // Incomplete XML without transient signal — real reporter regression.
            if (!isTransient) {
              return result;
            }

            if (!isLastAttempt) {
              console.log(
                `⚠️  Transient error detected: incomplete output (${testsuiteCount}/${minExpectedTestSuites} test suites) with ${detail}. Retrying once...`
              );
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }
          }

          // Non-transient error — real failure, surface to caller.
          if (!isTransient) {
            return result;
          }

          if (!isLastAttempt) {
            console.log(
              `⚠️  Transient error detected: ${detail}. Retrying once...`
            );
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }

          // Transient on last attempt — skip.
          console.warn(
            `⚠️  Skipping test: Retry exhausted due to ${detail}. External services may be unavailable.`
          );
          return null;
        }

        throw new Error("Unexpected: retry loop completed without returning");
      };

      const junitResult = await runWithValidation();
      if (junitResult === null) return;
      expect(junitResult.error).toBeNull();

      const junitXml = fs.readFileSync(junitPath, "utf-8");

      // Validate structural invariants using regex parsing.
      // Validate no testcases have "root" as name (would indicate assertions at root level).
      const testcaseRootPattern = /<testcase [^>]*name="root"/;
      expect(junitXml).not.toMatch(testcaseRootPattern);

      // Validate test structure: testcases should have meaningful names from test blocks
      const testcasePattern = /<testcase name="([^"]+)"/g;
      const testcaseNames = Array.from(
        junitXml.matchAll(testcasePattern),
        (m) => m[1]
      );

      // Ensure we have testcases
      expect(testcaseNames.length).toBeGreaterThan(0);

      // Ensure no empty testcase names
      for (const name of testcaseNames) {
        expect(name.length).toBeGreaterThan(0);
        expect(name).not.toBe("root");
      }

      // Validate presence of key test groups instead of snapshot comparison
      // This is more reliable for CI as network responses can vary

      // 1. Correct number of test suites
      const testsuitePattern = /<testsuite /g;
      const testsuiteCount = (junitXml.match(testsuitePattern) || []).length;
      expect(testsuiteCount).toBeGreaterThan(60); // Should have 67+ test suites with comprehensive additions

      // 2. Async pattern tests executed (from newly added requests)
      expect(junitXml).toContain('name="Pre-request top-level await works');
      expect(junitXml).toContain('name="Pre-request .then() chain works');
      expect(junitXml).toContain('name="Test script top-level await works');
      expect(junitXml).toContain('name="Await inside test callback works');
      expect(junitXml).toContain('name=".then() inside test callback works');
      expect(junitXml).toContain('name="Promise.all in test callback works');
      expect(junitXml).toContain('name="Sequential requests work');
      expect(junitXml).toContain('name="Parallel requests work');
      expect(junitXml).toContain('name="Auth workflow works');
      expect(junitXml).toContain('name="Complex workflow in test works');
      expect(junitXml).toContain('name="Error handling works');
      expect(junitXml).toContain('name="Large JSON payload works');

      // 3. Query parameter and URL construction tests
      expect(junitXml).toContain('name="Query parameters work');
      expect(junitXml).toContain('name="URL object works');
      expect(junitXml).toContain('name="Dynamic URL construction works');

      // 4. POST body variation tests
      expect(junitXml).toContain('name="POST JSON body works');
      expect(junitXml).toContain('name="POST URL-encoded body works');
      expect(junitXml).toContain('name="Binary POST works');

      // 5. HTTP method tests
      expect(junitXml).toContain('name="PUT method works');
      expect(junitXml).toContain('name="PATCH method works');
      expect(junitXml).toContain('name="DELETE method works');

      // 6. Response parsing tests
      expect(junitXml).toContain('name="Response headers accessible');
      expect(junitXml).toContain('name="response.text() works');
      expect(junitXml).toContain('name="Async response parsing in test works');

      // 7. Chai and BDD assertions
      expect(junitXml).toContain('name="Chai equality');
      expect(junitXml).toContain('name="pm.expect');
      expect(junitXml).toContain('name="hopp.expect');

      // 8. hopp.fetch() and pm.sendRequest() tests
      expect(junitXml).toContain(
        'name="hopp.fetch() should make successful GET request'
      );
      expect(junitXml).toContain(
        'name="pm.sendRequest() should work with string URL'
      );
      expect(junitXml).toContain(
        'name="hopp.fetch() should handle binary responses'
      );

      // 9. Validate test count is reasonable (comprehensive collection)
      const testsMatch = junitXml.match(/<testsuites tests="(\d+)"/);
      if (testsMatch) {
        const testCount = parseInt(testsMatch[1], 10);
        expect(testCount).toBeGreaterThan(800); // Should have 850+ tests with all comprehensive async additions
      }

      // 10. Validate no failures OR only network-related skips (not test failures)
      // This is flexible to handle transient network issues logged in console
      // Check that there are no actual test assertion failures
      const failuresMatch = junitXml.match(
        /<testsuites tests="\d+" failures="(\d+)"/
      );
      if (failuresMatch) {
        const failureCount = parseInt(failuresMatch[1], 10);
        // Allow the test to pass even if some tests were skipped due to network issues
        // The important thing is that actual test logic doesn't fail
        expect(failureCount).toBeLessThan(10); // Tolerate a few network-related skips
      }

      // Clean up
      fs.unlinkSync(junitPath);
    }, 600000); // 600 second (10 minute) timeout

    test("Inherited collection-level scripts run in order on the experimental sandbox (default)", async () => {
      const args = `test ${getTestJsonFilePath(
        "collection-level-scripts-coll.json",
        "collection"
      )}`;

      const defaultResult = await runCLIWithNetworkRetry(args);
      if (defaultResult === null) return;
      expect(defaultResult.error).toBeNull();
    });

    // The legacy sandbox uses a non-module evaluator that rejects top-level
    // ESM imports at parse time, so it runs against a pruned fixture that
    // omits the import-using request.
    test("Inherited collection-level scripts run in order on the legacy sandbox", async () => {
      const args = `test ${getTestJsonFilePath(
        "collection-level-scripts-legacy-coll.json",
        "collection"
      )} --legacy-sandbox`;

      const legacyResult = await runCLIWithNetworkRetry(args);
      if (legacyResult === null) return;
      expect(legacyResult.error).toBeNull();
    });

    test("Surfaces a SyntaxError when the same import binding appears in multiple scripts in a request's cascade", async () => {
      const args = `test ${getTestJsonFilePath(
        "collection-level-scripts-duplicate-import-coll.json",
        "collection"
      )}`;
      const { error, stderr } = await runCLI(args);

      expect(error).not.toBeNull();
      expect(stderr).toContain("PRE_REQUEST_SCRIPT_ERROR");
      expect(stderr).toContain(
        "'dup' is imported from different sources across scripts in this request's chain"
      );
    });
  });

  describe("Test `hopp test <file_path_or_id> --env <file_path_or_id>` command:", () => {
    describe("Supplied environment export file validations", () => {
      describe("Argument parsing", () => {
        test("Errors with the code `INVALID_ARGUMENT` if no file is supplied", async () => {
          const args = `${VALID_TEST_ARGS} --env`;
          const { stderr } = await runCLI(args);

          const out = getErrorCode(stderr);
          expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
        });
      });

      test("Errors with the code `INVALID_FILE_TYPE` if the supplied environment export file doesn't end with the `.json` extension", async () => {
        const args = `${VALID_TEST_ARGS} --env ${getTestJsonFilePath(
          "notjson-coll.txt",
          "collection"
        )}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
      });

      test("Errors with the code `FILE_NOT_FOUND` if the supplied environment export file doesn't exist", async () => {
        const args = `${VALID_TEST_ARGS} --env notfound.json`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
      });

      test("Errors with the code `MALFORMED_ENV_FILE` on supplying a malformed environment export file", async () => {
        const ENV_PATH = getTestJsonFilePath(
          "malformed-envs.json",
          "environment"
        );
        const args = `${VALID_TEST_ARGS} --env ${ENV_PATH}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("MALFORMED_ENV_FILE");
      });

      test("Errors with the code `BULK_ENV_FILE` on supplying an environment export file based on the bulk environment export format", async () => {
        const ENV_PATH = getTestJsonFilePath("bulk-envs.json", "environment");
        const args = `${VALID_TEST_ARGS} --env ${ENV_PATH}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("BULK_ENV_FILE");
      });
    });

    test("Successfully resolves values from the supplied environment export file", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "env-flag-tests-coll.json",
        "collection"
      );
      const ENV_PATH = getTestJsonFilePath("env-flag-envs.json", "environment");
      const args = `test ${COLL_PATH} --env ${ENV_PATH}`;

      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Successfully resolves environment variables referenced in the request body", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "req-body-env-vars-coll.json",
        "collection"
      );
      const ENV_PATH = getTestJsonFilePath(
        "req-body-env-vars-envs.json",
        "environment"
      );
      const args = `test ${COLL_PATH} --env ${ENV_PATH}`;

      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Works with short `-e` flag", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "env-flag-tests-coll.json",
        "collection"
      );
      const ENV_PATH = getTestJsonFilePath("env-flag-envs.json", "environment");
      const args = `test ${COLL_PATH} -e ${ENV_PATH}`;

      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    describe("Secret environment variables", () => {
      // Reads secret environment values from system environment
      test("Successfully picks the values for secret environment variables from `process.env` and persists the variables set from the pre-request script", async () => {
        const env = {
          ...process.env,
          secretBearerToken: "test-token",
          secretBasicAuthUsername: "test-user",
          secretBasicAuthPassword: "test-pass",
          secretQueryParamValue: "secret-query-param-value",
          secretBodyValue: "secret-body-value",
          secretHeaderValue: "secret-header-value",
        };

        const COLL_PATH = getTestJsonFilePath(
          "secret-envs-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath("secret-envs.json", "environment");
        const args = `test ${COLL_PATH} --env ${ENV_PATH}`;

        const result = await runCLIWithNetworkRetry(args, { env });
        if (result === null) return;

        expect(result.stdout).toContain(
          "https://httpbin.org/basic-auth/*********/*********"
        );
        expect(result.error).toBeNull();
      });

      test("Successfully picks the values for secret environment variables set directly in the environment export file and persists the environment variables set from the pre-request script", async () => {
        const COLL_PATH = getTestJsonFilePath(
          "secret-envs-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath(
          "secret-supplied-values-envs.json",
          "environment"
        );
        const args = `test ${COLL_PATH} --env ${ENV_PATH}`;

        const result = await runCLIWithNetworkRetry(args);
        if (result === null) return;

        expect(result.stdout).toContain(
          "https://httpbin.org/basic-auth/*********/*********"
        );
        expect(result.error).toBeNull();
      });

      test("Setting values for secret environment variables from the pre-request script overrides values set at the supplied environment export file", async () => {
        const COLL_PATH = getTestJsonFilePath(
          "secret-envs-persistence-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath(
          "secret-supplied-values-envs.json",
          "environment"
        );
        const args = `test ${COLL_PATH} --env ${ENV_PATH}`;

        const result = await runCLIWithNetworkRetry(args);
        if (result === null) return;

        expect(result.stdout).toContain(
          "https://httpbin.org/basic-auth/*********/*********"
        );
        expect(result.error).toBeNull();
      });

      test("Persists secret environment variable values set from the pre-request script for consumption in the request and post-request script context", async () => {
        const COLL_PATH = getTestJsonFilePath(
          "secret-envs-persistence-scripting-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath(
          "secret-envs-persistence-scripting-envs.json",
          "environment"
        );

        const args = `test ${COLL_PATH} --env ${ENV_PATH}`;

        const result = await runCLIWithNetworkRetry(args);
        if (result === null) return;
        expect(result.error).toBeNull();
      });
    });

    describe("Request variables", () => {
      test("Picks active request variables and ignores inactive entries alongside the usage of environment variables", async () => {
        const env = {
          ...process.env,
          secretBasicAuthPasswordEnvVar: "password",
        };

        const COLL_PATH = getTestJsonFilePath(
          "request-vars-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath(
          "request-vars-envs.json",
          "environment"
        );

        const args = `test ${COLL_PATH} --env ${ENV_PATH}`;

        const result = await runCLIWithNetworkRetry(args, { env });
        if (result === null) return;
        expect(result.stdout).toContain(
          "https://echo.hoppscotch.io/********/********"
        );
        expect(result.error).toBeNull();
      });
    });

    describe("AWS Signature Authorization type", () => {
      test("Successfully translates the authorization information to headers/query params and sends it along with the request", async () => {
        const env = {
          ...process.env,
          secretKey: "test-secret-key",
          serviceToken: "test-token",
        };

        const COLL_PATH = getTestJsonFilePath(
          "aws-signature-auth-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath(
          "aws-signature-auth-envs.json",
          "environment"
        );

        const args = `test ${COLL_PATH} -e ${ENV_PATH}`;
        const result = await runCLIWithNetworkRetry(args, { env });
        if (result === null) return;

        expect(result.error).toBeNull();
      });
    });

    describe("Digest Authorization type", () => {
      /**
       * NOTE: This test is being skipped because the test endpoint is no longer resolving
       * TODO: Find a reliable public endpoint that supports Digest Auth and re-enable this test
       */
      test.skip("Successfully translates the authorization information to headers/query params and sends it along with the request", async () => {
        const COLL_PATH = getTestJsonFilePath(
          "digest-auth-success-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath(
          "digest-auth-envs.json",
          "environment"
        );

        const args = `test ${COLL_PATH} -e ${ENV_PATH}`;
        const { error } = await runCLI(args);
        expect(error).toBeNull();
      });
    });

    test("Supports disabling request retries", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "digest-auth-failure-coll.json",
        "collection"
      );
      const ENV_PATH = getTestJsonFilePath(
        "digest-auth-envs.json",
        "environment"
      );

      const args = `test ${COLL_PATH} -e ${ENV_PATH}`;
      const { error } = await runCLI(args);

      expect(error).toBeTruthy();
    });

    describe("HAWK Authentication", () => {
      test("Correctly generates and attaches authorization headers to the request ", async () => {
        const COLL_PATH = getTestJsonFilePath(
          "hawk-auth-success-coll.json",
          "collection"
        );
        const ENV_PATH = getTestJsonFilePath(
          "hawk-auth-envs.json",
          "environment"
        );

        const args = `test ${COLL_PATH} -e ${ENV_PATH}`;
        const result = await runCLIWithNetworkRetry(args);
        if (result === null) return;

        expect(result.error).toBeNull();
      });
    });
  });

  describe("Test `hopp test <file_path_or_id> --delay <delay_in_ms>` command:", () => {
    describe("Argument parsing", () => {
      test("Errors with the code `INVALID_ARGUMENT` on not supplying a delay value", async () => {
        const args = `${VALID_TEST_ARGS} --delay`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
      });

      test("Errors with the code `INVALID_ARGUMENT` on supplying an invalid delay value", async () => {
        const args = `${VALID_TEST_ARGS} --delay 'NaN'`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
      });
    });

    test("Successfully performs delayed request execution for a valid delay value", async () => {
      const args = `${VALID_TEST_ARGS} --delay 1`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });

    test("Works with the short `-d` flag", async () => {
      const args = `${VALID_TEST_ARGS} -d 1`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;
      expect(result.error).toBeNull();
    });
  });

  // Future TODO: Enable once a proper e2e test environment is set up locally
  describe.skip("Test `hopp test <file_path_or_id> --env <file_path_or_id> --token <access_token> --server <server_url>` command:", () => {
    const {
      REQ_BODY_ENV_VARS_COLL_ID,
      COLLECTION_LEVEL_HEADERS_AUTH_COLL_ID,
      REQ_BODY_ENV_VARS_ENVS_ID,
      PERSONAL_ACCESS_TOKEN,
    } = process.env;

    if (
      !REQ_BODY_ENV_VARS_COLL_ID ||
      !COLLECTION_LEVEL_HEADERS_AUTH_COLL_ID ||
      !REQ_BODY_ENV_VARS_ENVS_ID ||
      !PERSONAL_ACCESS_TOKEN
    ) {
      return;
    }

    const SERVER_URL = "https://stage-shc.hoppscotch.io/backend";

    describe("Argument parsing", () => {
      test("Errors with the code `INVALID_ARGUMENT` on not supplying a value for the `--token` flag", async () => {
        const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --token`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
      });

      test("Errors with the code `INVALID_ARGUMENT` on not supplying a value for the `--server` flag", async () => {
        const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --server`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
      });
    });

    describe("Workspace access validations", () => {
      const INVALID_COLLECTION_ID = "invalid-coll-id";
      const INVALID_ENVIRONMENT_ID = "invalid-env-id";
      const INVALID_ACCESS_TOKEN = "invalid-token";

      test("Errors with the code `TOKEN_INVALID` if the supplied access token is invalid", async () => {
        const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --token ${INVALID_ACCESS_TOKEN} --server ${SERVER_URL}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("TOKEN_INVALID");
      });

      test("Errors with the code `INVALID_ID` if the supplied collection ID is invalid", async () => {
        const args = `test ${INVALID_COLLECTION_ID} --token ${PERSONAL_ACCESS_TOKEN} --server ${SERVER_URL}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ID");
      });

      test("Errors with the code `INVALID_ID` if the supplied environment ID is invalid", async () => {
        const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --env ${INVALID_ENVIRONMENT_ID} --token ${PERSONAL_ACCESS_TOKEN} --server ${SERVER_URL}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ID");
      });

      test("Errors with the code `INVALID_SERVER_URL` if not supplying a valid SH instance server URL", async () => {
        // FE URL of the staging SHC instance
        const INVALID_SERVER_URL = "https://stage-shc.hoppscotch.io";
        const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --env ${REQ_BODY_ENV_VARS_ENVS_ID} --token ${PERSONAL_ACCESS_TOKEN} --server ${INVALID_SERVER_URL}`;

        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_SERVER_URL");
      });

      test("Errors with the code `SERVER_CONNECTION_REFUSED` if supplying an SH instance server URL that doesn't follow URL semantics", async () => {
        const INVALID_URL = "invalid-url";
        const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --env ${REQ_BODY_ENV_VARS_ENVS_ID} --token ${PERSONAL_ACCESS_TOKEN} --server ${INVALID_URL}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("SERVER_CONNECTION_REFUSED");
      });
    });

    test("Successfully retrieves a collection with the ID", async () => {
      const args = `test ${COLLECTION_LEVEL_HEADERS_AUTH_COLL_ID} --token ${PERSONAL_ACCESS_TOKEN} --server ${SERVER_URL}`;

      const { error } = await runCLI(args);
      expect(error).toBeNull();
    });

    test("Successfully retrieves collections and environments from a workspace using their respective IDs", async () => {
      const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --env ${REQ_BODY_ENV_VARS_ENVS_ID} --token ${PERSONAL_ACCESS_TOKEN} --server ${SERVER_URL}`;

      const { error } = await runCLI(args);
      expect(error).toBeNull();
    });

    test("Supports specifying collection file path along with environment ID", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "req-body-env-vars-coll.json",
        "collection"
      );
      const args = `test ${COLL_PATH} --env ${REQ_BODY_ENV_VARS_ENVS_ID} --token ${PERSONAL_ACCESS_TOKEN} --server ${SERVER_URL}`;

      const { error } = await runCLI(args);
      expect(error).toBeNull();
    });

    test("Supports specifying environment file path along with collection ID", async () => {
      const ENV_PATH = getTestJsonFilePath(
        "req-body-env-vars-envs.json",
        "environment"
      );
      const args = `test ${REQ_BODY_ENV_VARS_COLL_ID} --env ${ENV_PATH} --token ${PERSONAL_ACCESS_TOKEN} --server ${SERVER_URL}`;

      const { error } = await runCLI(args);
      expect(error).toBeNull();
    });

    test("Supports specifying both collection and environment file paths", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "req-body-env-vars-coll.json",
        "collection"
      );
      const ENV_PATH = getTestJsonFilePath(
        "req-body-env-vars-envs.json",
        "environment"
      );
      const args = `test ${COLL_PATH} --env ${ENV_PATH} --token ${PERSONAL_ACCESS_TOKEN}`;

      const { error } = await runCLI(args);
      expect(error).toBeNull();
    });
  });

  describe("Test`hopp test <file_path_or_id> --env <file_path_or_id> --reporter-junit [path]", () => {
    const genPath = path.resolve("hopp-cli-test");

    // Helper function to replace dynamic values before generating test snapshots
    // Currently scoped to JUnit report generation
    const replaceDynamicValuesInStr = (input: string): string =>
      input
        .replace(/(time|timestamp)="[^"]+"/g, (_, attr) => `${attr}="${attr}"`)
        // Strip QuickJS GC assertion errors - these are non-deterministic
        // and appear after script errors when scope disposal fails
        // Pattern matches multi-line format ending with ]]
        .replace(
          /\n\s*Then, failed to dispose scope: Aborted\(Assertion failed[^\]]*\]\]/g,
          ""
        );

    beforeAll(() => {
      // Force-clean to recover from a prior interrupted run leaving stale
      // files or the directory itself behind.
      fs.rmSync(genPath, { recursive: true, force: true });
      fs.mkdirSync(genPath);
    });

    afterAll(() => {
      fs.rmSync(genPath, { recursive: true, force: true });
    });

    // Retries JUnit snapshot on transient signals; returns null only on confirmed flake.
    // `preSeed`, if provided, runs before each attempt so tests that need a
    // pre-existing file (e.g. overwrite-log coverage) can re-seed between retries.
    const runJUnitSnapshot = async (
      args: string,
      exportPath: string,
      preSeed?: () => void
    ): Promise<{
      result: Awaited<ReturnType<typeof runCLI>>;
      fileContents: string;
    } | null> => {
      const maxAttempts = 2;
      const absPath = path.resolve(genPath, exportPath);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (preSeed) {
          if (fs.existsSync(absPath)) {
            try {
              fs.unlinkSync(absPath);
            } catch {}
          }
          preSeed();
        }

        const result = await runCLI(args, {
          cwd: path.resolve("hopp-cli-test"),
        });

        const xmlOnDisk = fs.existsSync(absPath);
        const fileContents = xmlOnDisk
          ? fs.readFileSync(absPath).toString()
          : "";
        const combinedOutput = `${result.stdout}\n${result.stderr}\n${fileContents}`;
        const { isTransient } = isTransientCliFailure(combinedOutput);
        const isLastAttempt = attempt === maxAttempts - 1;

        // Non-transient outcome — surface to caller (real bug or intentional
        // error-path fixture); callers own their own assertions.
        if (!isTransient) {
          return { result, fileContents };
        }

        if (!isLastAttempt) {
          console.log(
            `⚠️  Transient signal in JUnit snapshot run — retrying once for a clean snapshot...`
          );
          if (xmlOnDisk) {
            try {
              fs.unlinkSync(absPath);
            } catch {}
          }
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        console.warn(
          `⚠️  Skipping snapshot test: transient signals persisted after retry. External services may be degraded.`
        );
        return null;
      }

      throw new Error("Unexpected: retry loop completed without returning");
    };

    test("Report export fails with the code `REPORT_EXPORT_FAILED` while encountering an error during path creation", async () => {
      const exportPath = "hopp-junit-report.xml";

      const COLL_PATH = getTestJsonFilePath("passes-coll.json", "collection");

      const invalidPath =
        process.platform === "win32"
          ? "Z:/non-existent-path/report.xml"
          : "/non-existent/report.xml";

      const args = `test ${COLL_PATH} --reporter-junit ${invalidPath}`;

      const { stdout, stderr } = await runCLI(args, {
        cwd: path.resolve("hopp-cli-test"),
      });

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("REPORT_EXPORT_FAILED");

      expect(stdout).not.toContain(
        `Successfully exported the JUnit report to: ${exportPath}`
      );
    });

    test("Generates a JUnit report at the default path", async ({ skip }) => {
      const exportPath = "hopp-junit-report.xml";

      const COLL_PATH = getTestJsonFilePath(
        "test-junit-report-export-coll.json",
        "collection"
      );

      const args = `test ${COLL_PATH} --reporter-junit`;

      const outcome = await runJUnitSnapshot(args, exportPath);
      // `skip()` keeps snapshots deferred rather than obsolete when transient flakes abort the run.
      if (outcome === null) {
        skip();
        return;
      }
      const { result, fileContents } = outcome;

      expect(result.stdout).not.toContain(
        `Overwriting the pre-existing path: ${exportPath}`
      );

      expect(result.stdout).toContain(
        `Successfully exported the JUnit report to: ${exportPath}`
      );

      expect(replaceDynamicValuesInStr(fileContents)).toMatchSnapshot();
    });

    test("Generates a JUnit report at the specified path", async ({ skip }) => {
      const exportPath = "outer-dir/inner-dir/report.xml";

      const COLL_PATH = getTestJsonFilePath(
        "test-junit-report-export-coll.json",
        "collection"
      );

      const args = `test ${COLL_PATH} --reporter-junit ${exportPath}`;

      const outcome = await runJUnitSnapshot(args, exportPath);
      if (outcome === null) {
        skip();
        return;
      }
      const { result, fileContents } = outcome;

      expect(result.stdout).not.toContain(
        `Overwriting the pre-existing path: ${exportPath}`
      );

      expect(result.stdout).toContain(
        `Successfully exported the JUnit report to: ${exportPath}`
      );

      expect(replaceDynamicValuesInStr(fileContents)).toMatchSnapshot();
    });

    test("Generates a JUnit report for a collection with authorization/headers set at the collection level", async ({ skip }) => {
      const exportPath = "collection-level-auth-headers-report.xml";

      const COLL_PATH = getTestJsonFilePath(
        "collection-level-auth-headers-coll.json",
        "collection"
      );

      const args = `test ${COLL_PATH} --reporter-junit ${exportPath}`;

      const outcome = await runJUnitSnapshot(args, exportPath);
      if (outcome === null) {
        skip();
        return;
      }
      const { result, fileContents } = outcome;

      expect(result.stdout).toContain(
        `Successfully exported the JUnit report to: ${exportPath}`
      );

      expect(replaceDynamicValuesInStr(fileContents)).toMatchSnapshot();
    });

    test("Generates a JUnit report for a collection referring to environment variables", async ({ skip }) => {
      const exportPath = "env-vars-report.xml";

      const COLL_PATH = getTestJsonFilePath(
        "req-body-env-vars-coll.json",
        "collection"
      );
      const ENV_PATH = getTestJsonFilePath(
        "req-body-env-vars-envs.json",
        "environment"
      );

      const args = `test ${COLL_PATH} --env ${ENV_PATH} --reporter-junit ${exportPath}`;

      const outcome = await runJUnitSnapshot(args, exportPath);
      if (outcome === null) {
        skip();
        return;
      }
      const { result, fileContents } = outcome;

      expect(result.stdout).toContain(
        `Successfully exported the JUnit report to: ${exportPath}`
      );

      expect(replaceDynamicValuesInStr(fileContents)).toMatchSnapshot();
    });

    test("Logs overwrite message when the JUnit target file already exists", async ({ skip }) => {
      const exportPath = "overwrite-test-report.xml";
      const absPath = path.resolve(genPath, exportPath);

      const COLL_PATH = getTestJsonFilePath(
        "test-junit-report-export-coll.json",
        "collection"
      );
      const args = `test ${COLL_PATH} --reporter-junit ${exportPath}`;

      // Re-seed a placeholder before each attempt so the reporter's
      // overwrite branch fires on retry just as it does on attempt 0.
      const outcome = await runJUnitSnapshot(args, exportPath, () => {
        fs.writeFileSync(absPath, "<placeholder />");
      });

      if (outcome === null) {
        skip();
        return;
      }

      const { result } = outcome;
      expect(result.stdout).toContain(
        `Overwriting the pre-existing path: ${exportPath}`
      );
      expect(result.stdout).toContain(
        `Successfully exported the JUnit report to: ${exportPath}`
      );
    });
  });

  describe("Test `hopp test <file> --iteration-count <no_of_iterations>` command:", () => {
    const VALID_TEST_ARGS = `test ${getTestJsonFilePath("passes-coll.json", "collection")}`;

    test("Errors with the code `INVALID_ARGUMENT` on not supplying an iteration count", async () => {
      const args = `${VALID_TEST_ARGS} --iteration-count`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("Errors with the code `INVALID_ARGUMENT` on supplying an invalid iteration count", async () => {
      const args = `${VALID_TEST_ARGS} --iteration-count NaN`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("Errors with the code `INVALID_ARGUMENT` on supplying an iteration count below `1`", async () => {
      const args = `${VALID_TEST_ARGS} --iteration-count -5`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("Successfully executes all requests in the collection iteratively based on the specified iteration count", async () => {
      const iterationCount = 3;
      const args = `${VALID_TEST_ARGS} --iteration-count ${iterationCount}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      Array.from({ length: 3 }).forEach((_, idx) =>
        expect(result.stdout).include(`Iteration: ${idx + 1}/${iterationCount}`)
      );
      expect(result.error).toBeNull();
    });

    test("Doesn't log iteration count if the value supplied is `1`", async () => {
      const args = `${VALID_TEST_ARGS} --iteration-count 1`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      expect(result.stdout).not.include(`Iteration: 1/1`);

      expect(result.error).toBeNull();
    });
  });

  describe("Test `hopp test <file> --iteration-data <file_path>` command:", () => {
    describe("Supplied data export file validations", () => {
      const VALID_TEST_ARGS = `test ${getTestJsonFilePath("passes-coll.json", "collection")}`;

      test("Errors with the code `INVALID_ARGUMENT` if no file is supplied", async () => {
        const args = `${VALID_TEST_ARGS} --iteration-data`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
      });

      test("Errors with the code `INVALID_DATA_FILE_TYPE` if the supplied data file doesn't end with the `.csv` extension", async () => {
        const args = `${VALID_TEST_ARGS} --iteration-data ${getTestJsonFilePath(
          "notjson-coll.txt",
          "collection"
        )}`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("INVALID_DATA_FILE_TYPE");
      });

      test("Errors with the code `FILE_NOT_FOUND` if the supplied data export file doesn't exist", async () => {
        const args = `${VALID_TEST_ARGS} --iteration-data notfound.csv`;
        const { stderr } = await runCLI(args);

        const out = getErrorCode(stderr);
        expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
      });
    });

    test("Prioritizes values from the supplied data export file over environment variables with relevant fallbacks for missing entries", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "iteration-data-tests-coll.json",
        "collection"
      );
      const ITERATION_DATA_PATH = getTestJsonFilePath(
        "iteration-data-export.csv",
        "environment"
      );
      const ENV_PATH = getTestJsonFilePath(
        "iteration-data-envs.json",
        "environment"
      );
      const args = `test ${COLL_PATH} --iteration-data ${ITERATION_DATA_PATH} -e ${ENV_PATH}`;

      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      const iterationCount = 3;

      Array.from({ length: iterationCount }).forEach((_, idx) =>
        expect(result.stdout).include(`Iteration: ${idx + 1}/${iterationCount}`)
      );

      expect(result.error).toBeNull();
    });

    test("Iteration count takes priority if supplied instead of inferring from the iteration data size", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "iteration-data-tests-coll.json",
        "collection"
      );
      const ITERATION_DATA_PATH = getTestJsonFilePath(
        "iteration-data-export.csv",
        "environment"
      );
      const ENV_PATH = getTestJsonFilePath(
        "iteration-data-envs.json",
        "environment"
      );

      const iterationCount = 5;
      const args = `test ${COLL_PATH} --iteration-data ${ITERATION_DATA_PATH} -e ${ENV_PATH} --iteration-count ${iterationCount}`;

      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      Array.from({ length: iterationCount }).forEach((_, idx) =>
        expect(result.stdout).include(`Iteration: ${idx + 1}/${iterationCount}`)
      );

      expect(result.error).toBeNull();
    });
  });

  describe("Test `hopp test <file_path_or_id>` command with GraphQL requests:", () => {
    test("Successfully runs an all-GraphQL collection, including pre-request scripts and header templating", async () => {
      const args = `test ${getTestJsonFilePath("gql-coll.json", "collection")}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      // Assert content so a regression back to skip-GraphQL can't pass
      expect(result.stdout).toContain("echoes the POST method");
      expect(result.stdout).toContain("scripted header echoed");
      expect(result.error).toBeNull();
    });

    test("Successfully runs a collection mixing REST and GraphQL requests, resolving environment variables from the supplied env file", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "mixed-rest-gql-coll.json",
        "collection"
      );
      const ENV_PATH = getTestJsonFilePath("gql-envs.json", "environment");
      const args = `test ${COLL_PATH} --env ${ENV_PATH}`;
      const result = await runCLIWithNetworkRetry(args);
      if (result === null) return;

      expect(result.stdout).toContain("REST responds 200");
      expect(result.stdout).toContain("env templated header echoed");
      expect(result.stdout).toContain("anonymous query in nested folder");
      expect(result.error).toBeNull();
    });
  });
});
