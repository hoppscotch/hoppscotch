import { describe, expect, test } from "vitest";

import {
  combineScriptsWithIIFE,
  stripModulePrefix,
  MODULE_PREFIX,
} from "../../utils/scripting";

describe("scripting", () => {
  describe("stripModulePrefix", () => {
    test("strips 'export {};\\n' prefix", () => {
      expect(stripModulePrefix("export {};\nconst x = 1;")).toBe(
        "const x = 1;"
      );
    });

    test("strips 'export {};' prefix without newline", () => {
      expect(stripModulePrefix("export {};const x = 1;")).toBe("const x = 1;");
    });

    test("returns script unchanged if no prefix", () => {
      expect(stripModulePrefix("const x = 1;")).toBe("const x = 1;");
    });

    test("returns empty string unchanged", () => {
      expect(stripModulePrefix("")).toBe("");
    });
  });

  describe("combineScriptsWithIIFE", () => {
    test("returns empty string for empty array", () => {
      expect(combineScriptsWithIIFE([])).toBe("");
    });

    test("returns empty string when all scripts are empty", () => {
      expect(combineScriptsWithIIFE(["", "  ", "\n"])).toBe("");
    });

    test("wraps a single script in a sequential async IIFE", () => {
      const result = combineScriptsWithIIFE(["const x = 1;"]);

      expect(result).toContain("async");
      expect(result).toContain("await");
      expect(result).toContain("const x = 1;");
    });

    test("preserves script order (root → parent → child → request) for pre-request scripts", () => {
      const rootScript = 'pw.env.set("token", "root");';
      const parentScript = 'pw.env.set("parent", "true");';
      const requestScript = 'pw.env.set("request", "true");';

      const result = combineScriptsWithIIFE([
        rootScript,
        parentScript,
        requestScript,
      ]);

      const rootIndex = result.indexOf(rootScript);
      const parentIndex = result.indexOf(parentScript);
      const requestIndex = result.indexOf(requestScript);

      expect(rootIndex).toBeLessThan(parentIndex);
      expect(parentIndex).toBeLessThan(requestIndex);
    });

    test("preserves script order (request → child → parent → root) for test scripts", () => {
      const requestScript = 'pw.test("request test", () => {});';
      const childScript = 'pw.test("child test", () => {});';
      const rootScript = 'pw.test("root test", () => {});';

      // Simulates the reversal pattern used in test runner:
      // combineScriptsWithIIFE([requestScript, ...inheritedTestScripts.slice().reverse()])
      const inheritedTestScripts = [rootScript, childScript];
      const result = combineScriptsWithIIFE([
        requestScript,
        ...inheritedTestScripts.slice().reverse(),
      ]);

      const requestIndex = result.indexOf(requestScript);
      const childIndex = result.indexOf(childScript);
      const rootIndex = result.indexOf(rootScript);

      expect(requestIndex).toBeLessThan(childIndex);
      expect(childIndex).toBeLessThan(rootIndex);
    });

    test("filters out empty scripts while preserving non-empty ones", () => {
      const script1 = "const a = 1;";
      const script2 = "const b = 2;";

      const result = combineScriptsWithIIFE([script1, "", "  ", script2]);

      expect(result).toContain(script1);
      expect(result).toContain(script2);

      // Should only have 2 await statements (not 4)
      const awaitCount = (result.match(/await/g) || []).length;
      expect(awaitCount).toBe(2);
    });

    test("isolates variable scope between scripts (each wrapped in its own function)", () => {
      const script1 = "const x = 1;";
      const script2 = "const x = 2;";

      const result = combineScriptsWithIIFE([script1, script2]);

      // Both scripts should appear in separate async functions
      const fnCount = (result.match(/async function\(\)/g) || []).length;
      expect(fnCount).toBe(2);
    });

    test("strips module prefix from scripts before wrapping", () => {
      const script = `${MODULE_PREFIX}const x = 1;`;

      const result = combineScriptsWithIIFE([script]);

      // The module prefix should be stripped
      expect(result).not.toContain("export {};");
      expect(result).toContain("const x = 1;");
    });

    test("generates sequential await chain for multiple scripts", () => {
      const result = combineScriptsWithIIFE([
        "const a = 1;",
        "const b = 2;",
        "const c = 3;",
      ]);

      // Should be wrapped in an outer async IIFE
      expect(result).toMatch(/^\(async \(\) => \{/);
      expect(result).toMatch(/\}\)\(\);$/);

      // Each script should be awaited
      const awaitCount = (result.match(/await/g) || []).length;
      expect(awaitCount).toBe(3);
    });
  });
});
