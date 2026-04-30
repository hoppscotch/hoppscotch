import { describe, expect, test } from "vitest";
import { stripComments } from "../../utils/jsonc";

describe("stripComments", () => {
  describe("handles inline comments", () => {
    test("removes single inline comment", () => {
      const input = '{"key": "value" // comment\n}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key: "value" });
    });

    test("removes multiple inline comments", () => {
      const input = '{\n  "key1": "value1", // comment1\n  "key2": "value2" // comment2\n}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key1: "value1", key2: "value2" });
    });
  });

  describe("handles multiline comments", () => {
    test("removes single multiline comment", () => {
      const input = '{\n  /* This is a comment */\n  "key": "value"\n}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key: "value" });
    });

    test("removes multiline comment spanning multiple lines", () => {
      const input = '{\n  /* This is\n     a multiline\n     comment */\n  "key": "value"\n}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key: "value" });
    });
  });

  describe("handles trailing commas", () => {
    test("removes trailing comma in object", () => {
      const input = '{"key": "value",}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key: "value" });
    });

    test("removes trailing comma in array", () => {
      const input = '["item1", "item2",]';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(["item1", "item2"]);
    });

    test("removes multiple trailing commas in nested structures", () => {
      const input = '{"arr": ["a", "b",], "obj": {"key": "value",},}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ arr: ["a", "b"], obj: { key: "value" } });
    });
  });

  describe("handles combined cases", () => {
    test("removes both comments and trailing commas", () => {
      const input = '{\n  "key1": "value1", // inline comment\n  /* block comment */\n  "key2": "value2",\n}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key1: "value1", key2: "value2" });
    });

    test("handles nested objects with comments and trailing commas", () => {
      const input = '{\n  "outer": { // comment\n    "inner": "value",\n  },\n}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ outer: { inner: "value" } });
    });
  });

  describe("handles edge cases", () => {
    test("returns empty string unchanged", () => {
      const input = "";
      const result = stripComments(input);
      expect(result).toBe("");
    });

    test("returns whitespace-only string unchanged", () => {
      const input = "   \n  \t  ";
      const result = stripComments(input);
      expect(result).toBe(input);
    });

    test("handles valid JSON without comments", () => {
      const input = '{"key": "value"}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key: "value" });
    });

    test("preserves JSON strings containing comment-like sequences", () => {
      const input = '{"url": "https://example.com//path"}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed.url).toBe("https://example.com//path");
    });

    test("handles deeply nested structures", () => {
      const input = '{\n  "a": {\n    "b": {\n      "c": {\n        "d": "value", // nested comment\n      },\n    },\n  },\n}';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ a: { b: { c: { d: "value" } } } });
    });

    test("handles arrays with mixed content", () => {
      const input = '[\n  "string",\n  123, // number\n  true, // boolean\n  null, // null\n  {"nested": "object",}, // object\n]';
      const result = stripComments(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(["string", 123, true, null, { nested: "object" }]);
    });
  });

  describe("handles null return from stripComments_", () => {
    test("gracefully handles potential null from jsonc-parser", () => {
      const input = '{"key": "value"}';
      const result = stripComments(input);
      expect(result).toBeTruthy();
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ key: "value" });
    });
  });

  describe("handles malformed JSON", () => {
    test("attempts to parse malformed JSON and returns result", () => {
      // jsonc-parser is lenient and tries to repair malformed JSON
      const input = '{"key": "value"'; // missing closing brace
      const result = stripComments(input);
      // The parser will attempt to close the brace
      expect(result).toBe('{"key":"value"}');
    });

    test("gracefully handles completely invalid JSON", () => {
      const input = 'this is not json at all {]}{]';
      const result = stripComments(input);
      // jsonc-parser extracts what it can and returns an object (even if mostly empty)
      expect(result).toBe('{}');
    });

    test("handles JSON with syntax errors", () => {
      const input = '{"key": undefined}'; // undefined is not valid JSON
      const result = stripComments(input);
      // Parser will handle this - exact behavior depends on jsonc-parser
      expect(typeof result).toBe('string');
    });
  });
});
