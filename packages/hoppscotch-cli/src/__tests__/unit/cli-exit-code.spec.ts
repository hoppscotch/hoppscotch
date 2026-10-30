import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../commands/test", () => ({
  test: vi.fn(),
}));

import { cli } from "../../index";
import { test as testCommand } from "../../commands/test";

describe("cli() exit code", () => {
  beforeEach(() => {
    process.exitCode = undefined;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  test("Exits with code 1 and reports the error when a command throws an unexpected error", async () => {
    vi.mocked(testCommand).mockReturnValue(() =>
      Promise.reject(new Error("unexpected failure"))
    );

    await cli(["node", "hopp", "test", "coll.json"]);

    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalled();
  });
});
