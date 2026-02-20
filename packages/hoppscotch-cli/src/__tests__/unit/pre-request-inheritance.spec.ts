import { describe, expect, test } from "vitest";
import { makeRESTRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";

import { preRequestScriptRunner } from "../../utils/pre-request";
import { HoppEnvs } from "../../types/request";

const SAMPLE_ENVS: HoppEnvs = {
  global: [],
  selected: [],
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

describe("preRequestScriptRunner - inheritance", () => {
  test("Inherited scripts execute in root → parent → request order", async () => {
    const rootScript = `pw.env.set("ORDER", "root");`;
    const parentScript = `
      const prev = pw.env.get("ORDER");
      pw.env.set("ORDER", prev + ",parent");
    `;
    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      preRequestScript: `
        const prev = pw.env.get("ORDER");
        pw.env.set("ORDER", prev + ",request");
      `,
    });

    const result = await preRequestScriptRunner(
      request,
      SAMPLE_ENVS,
      false,
      undefined,
      [rootScript, parentScript]
    )();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      const orderVar = result.right.updatedEnvs.selected.find(
        (v) => v.key === "ORDER"
      );
      expect(orderVar?.currentValue).toBe("root,parent,request");
    }
  });

  test("Inherited scripts set ENVs used in request endpoint resolution", async () => {
    const rootScript = `pw.env.set("ENDPOINT", "https://example.com");`;

    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      endpoint: "<<ENDPOINT>>",
      preRequestScript: "",
    });

    const result = await preRequestScriptRunner(
      request,
      SAMPLE_ENVS,
      false,
      undefined,
      [rootScript]
    )();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      expect(result.right.effectiveRequest.effectiveFinalURL).toBe(
        "https://example.com"
      );
    }
  });

  test("Scripts with same local variable names do not collide (IIFE isolation)", async () => {
    const rootScript = `const x = "root"; pw.env.set("ROOT_VAR", x);`;
    const parentScript = `const x = "parent"; pw.env.set("PARENT_VAR", x);`;

    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      preRequestScript: `const x = "request"; pw.env.set("REQUEST_VAR", x);`,
    });

    const result = await preRequestScriptRunner(
      request,
      SAMPLE_ENVS,
      false,
      undefined,
      [rootScript, parentScript]
    )();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      const envVars = result.right.updatedEnvs.selected;
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

  test("Empty inherited scripts are filtered out gracefully", async () => {
    const validScript = `pw.env.set("ENDPOINT", "https://example.com");`;

    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      endpoint: "<<ENDPOINT>>",
      preRequestScript: "",
    });

    const result = await preRequestScriptRunner(
      request,
      SAMPLE_ENVS,
      false,
      undefined,
      ["", "  ", validScript, "\n"]
    )();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      expect(result.right.effectiveRequest.effectiveFinalURL).toBe(
        "https://example.com"
      );
    }
  });

  test("Works correctly with no inherited scripts (backward compatibility)", async () => {
    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      endpoint: "<<ENDPOINT>>",
      preRequestScript: `pw.env.set("ENDPOINT", "https://example.com");`,
    });

    const result = await preRequestScriptRunner(
      request,
      SAMPLE_ENVS,
      false,
      undefined,
      []
    )();

    expect(result).toBeRight();

    if (E.isRight(result)) {
      expect(result.right.effectiveRequest.effectiveFinalURL).toBe(
        "https://example.com"
      );
    }
  });
});
