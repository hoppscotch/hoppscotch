import { describe, expect, test } from "vitest";
import { makeRESTRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";

import { testRunner } from "../../utils/test";
import { HoppEnvs } from "../../types/request";

const SAMPLE_ENVS: HoppEnvs = {
  global: [],
  selected: [],
};

const SAMPLE_RESPONSE = {
  status: 200,
  headers: [],
  body: {},
  statusText: "OK",
  responseTime: 100,
};

const SAMPLE_REQUEST = makeRESTRequest({
  name: "request",
  method: "GET",
  endpoint: "https://example.com",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: { authActive: false, authType: "none" },
  body: {
    contentType: null,
    body: null,
  },
  requestVariables: [],
  description: null,
  responses: {},
});

describe("testRunner - inheritance", () => {
  test("Inherited test scripts are executed and register test cases", async () => {
    const rootTestScript = `
      pw.test("Root collection test", () => {
        pw.expect(pw.response.status).toBe(200);
      });
    `;

    const result = await testRunner({
      request: makeRESTRequest({
        ...SAMPLE_REQUEST,
        testScript: `
          pw.test("Request test", () => {
            pw.expect(pw.response.status).toBe(200);
          });
        `,
      }),
      envs: SAMPLE_ENVS,
      response: SAMPLE_RESPONSE,
      legacySandbox: false,
      inheritedTestScripts: [rootTestScript],
    })();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      const { testsReport } = result.right;
      const descriptors = testsReport.map((r) => r.descriptor);

      expect(descriptors).toContain("Request test");
      expect(descriptors).toContain("Root collection test");
    }
  });

  test("Inherited test scripts execute in request → child → parent → root order", async () => {
    const rootTestScript = `
      const prev = pw.env.get("ORDER");
      pw.env.set("ORDER", prev + ",root");
    `;
    const parentTestScript = `
      const prev = pw.env.get("ORDER");
      pw.env.set("ORDER", prev + ",parent");
    `;

    const result = await testRunner({
      request: makeRESTRequest({
        ...SAMPLE_REQUEST,
        testScript: `pw.env.set("ORDER", "request");`,
      }),
      envs: SAMPLE_ENVS,
      response: SAMPLE_RESPONSE,
      legacySandbox: false,
      // Stored as root → parent, reversed to parent → root during execution
      inheritedTestScripts: [rootTestScript, parentTestScript],
    })();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      const orderVar = result.right.envs.selected.find(
        (v) => v.key === "ORDER"
      );
      expect(orderVar?.currentValue).toBe("request,parent,root");
    }
  });

  test("Scripts with same local variable names do not collide (IIFE isolation)", async () => {
    const rootTestScript = `const x = "root"; pw.env.set("ROOT_VAR", x);`;
    const parentTestScript = `const x = "parent"; pw.env.set("PARENT_VAR", x);`;

    const result = await testRunner({
      request: makeRESTRequest({
        ...SAMPLE_REQUEST,
        testScript: `const x = "request"; pw.env.set("REQUEST_VAR", x);`,
      }),
      envs: SAMPLE_ENVS,
      response: SAMPLE_RESPONSE,
      legacySandbox: false,
      inheritedTestScripts: [rootTestScript, parentTestScript],
    })();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      const envVars = result.right.envs.selected;
      expect(envVars.find((v) => v.key === "ROOT_VAR")?.currentValue).toBe(
        "root"
      );
      expect(envVars.find((v) => v.key === "PARENT_VAR")?.currentValue).toBe(
        "parent"
      );
      expect(envVars.find((v) => v.key === "REQUEST_VAR")?.currentValue).toBe(
        "request"
      );
    }
  });

  test("Empty inherited test scripts are filtered out gracefully", async () => {
    const validScript = `
      pw.test("Valid inherited test", () => {
        pw.expect(pw.response.status).toBe(200);
      });
    `;

    const result = await testRunner({
      request: makeRESTRequest({
        ...SAMPLE_REQUEST,
        testScript: `
          pw.test("Request test", () => {
            pw.expect(pw.response.status).toBe(200);
          });
        `,
      }),
      envs: SAMPLE_ENVS,
      response: SAMPLE_RESPONSE,
      legacySandbox: false,
      inheritedTestScripts: ["", "  ", validScript, "\n"],
    })();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      const { testsReport } = result.right;
      const descriptors = testsReport.map((r) => r.descriptor);

      expect(descriptors).toContain("Request test");
      expect(descriptors).toContain("Valid inherited test");
    }
  });

  test("Works correctly with no inherited test scripts (backward compatibility)", async () => {
    const result = await testRunner({
      request: makeRESTRequest({
        ...SAMPLE_REQUEST,
        testScript: `
          pw.test("Solo request test", () => {
            pw.expect(pw.response.status).toBe(200);
          });
        `,
      }),
      envs: SAMPLE_ENVS,
      response: SAMPLE_RESPONSE,
      legacySandbox: false,
      inheritedTestScripts: [],
    })();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      const { testsReport } = result.right;
      expect(testsReport.map((r) => r.descriptor)).toContain(
        "Solo request test"
      );
    }
  });
});
