import { describe, expect, it } from "vitest";

import { getTestableBody } from "../../utils/request";

const JSON_PAYLOAD = '{"test": "123"}';
const JSON_CONTENT_TYPE = "application/json";
const BINARY_CONTENT_TYPE = "application/octet-stream";

const headersOf = (contentType?: string) =>
  contentType ? [{ key: "content-type", value: contentType }] : [];

describe("getTestableBody", () => {
  it("keeps the raw string for a non-JSON content type", () => {
    expect(getTestableBody(JSON_PAYLOAD, headersOf(BINARY_CONTENT_TYPE))).toBe(
      JSON_PAYLOAD
    );
  });

  it("keeps the raw string when no content type is present", () => {
    expect(getTestableBody(JSON_PAYLOAD, headersOf())).toBe(JSON_PAYLOAD);
  });

  it("parses the payload for a JSON content type", () => {
    expect(getTestableBody(JSON_PAYLOAD, headersOf(JSON_CONTENT_TYPE))).toEqual(
      {
        test: "123",
      }
    );
  });

  it("parses the payload for a JSON content type carrying parameters", () => {
    expect(
      getTestableBody(
        JSON_PAYLOAD,
        headersOf(`${JSON_CONTENT_TYPE}; charset=utf-8`)
      )
    ).toEqual({ test: "123" });
  });

  it("parses the payload for a suffixed JSON content type", () => {
    expect(
      getTestableBody(JSON_PAYLOAD, headersOf("application/vnd.api+json"))
    ).toEqual({ test: "123" });
  });

  it("matches the content type case-insensitively", () => {
    expect(
      getTestableBody(JSON_PAYLOAD, [
        { key: "Content-Type", value: JSON_CONTENT_TYPE.toUpperCase() },
      ])
    ).toEqual({ test: "123" });
  });

  it("falls back to the raw string when a JSON content type carries an unparseable payload", () => {
    expect(getTestableBody("not json", headersOf(JSON_CONTENT_TYPE))).toBe(
      "not json"
    );
  });

  it("keeps an empty body as an empty string", () => {
    expect(getTestableBody("", headersOf(BINARY_CONTENT_TYPE))).toBe("");
  });
});
