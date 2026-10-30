import { Environment } from "@hoppscotch/data";
import { describe, expect, test, vi } from "vitest";

import { processVariables } from "../../utils/request";

describe("processVariables", () => {
  const createSecretVariable = (
    overrides: Partial<Environment["variables"][number]> = {}
  ) =>
    ({
      key: "TEST_SECRET",
      initialValue: "initial-secret",
      currentValue: "",
      secret: true,
      ...overrides,
    }) as Environment["variables"][number];

  test("preserves whitespace in currentValue", () => {
    vi.stubEnv("TEST_SECRET", "  env-secret  ");

    const variable = createSecretVariable({
      currentValue: "  current-secret  ",
    });

    expect(processVariables(variable).currentValue).toBe("  current-secret  ");

    vi.unstubAllEnvs();
  });

  test("preserves whitespace in process.env value", () => {
    vi.stubEnv("TEST_SECRET", "  env-secret  ");

    const variable = createSecretVariable({
      currentValue: "",
    });

    expect(processVariables(variable).currentValue).toBe("  env-secret  ");

    vi.unstubAllEnvs();
  });

  test("preserves whitespace in initialValue", () => {
    vi.stubEnv("TEST_SECRET", "");

    const variable = createSecretVariable({
      currentValue: "",
      initialValue: "  initial-secret  ",
    });

    expect(processVariables(variable).currentValue).toBe("  initial-secret  ");

    vi.unstubAllEnvs();
  });

  test("falls back when currentValue contains only whitespace", () => {
    vi.stubEnv("TEST_SECRET", "  env-secret  ");

    const variable = createSecretVariable({
      currentValue: "   ",
    });

    expect(processVariables(variable).currentValue).toBe("  env-secret  ");

    vi.unstubAllEnvs();
  });

  test("falls back to initialValue when currentValue and env are whitespace", () => {
    vi.stubEnv("TEST_SECRET", "   ");

    const variable = createSecretVariable({
      currentValue: "   ",
      initialValue: "  initial-secret  ",
    });

    expect(processVariables(variable).currentValue).toBe("  initial-secret  ");

    vi.unstubAllEnvs();
  });
});
