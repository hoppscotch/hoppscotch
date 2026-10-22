import { describe, expect, test } from "vitest";
import { Environment, isGQLRequest } from "@hoppscotch/data";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { parseCollectionData } from "../../utils/mutators";
import { getTestJsonFilePath } from "../utils";

describe("collection ingestion — mixed and GraphQL fixtures", () => {
  test("mixed-rest-gql-coll.json parses with REST and GraphQL requests in order", async () => {
    const collections = await parseCollectionData(
      getTestJsonFilePath("mixed-rest-gql-coll.json", "collection"),
      {}
    );

    expect(collections).toHaveLength(1);
    const [collection] = collections;

    expect(collection.requests.map((r) => isGQLRequest(r))).toEqual([
      false,
      true,
    ]);

    expect(collection.folders).toHaveLength(1);
    expect(collection.folders[0].requests.map((r) => isGQLRequest(r))).toEqual([
      true,
    ]);

    const gqlRequest = collection.requests[1];
    if (isGQLRequest(gqlRequest)) {
      expect(gqlRequest.query).toContain("query GreetingEcho");
      expect(gqlRequest.headers[0].value).toContain("<<greeting>>");
    }
  });

  test("gql-coll.json parses as an all-GraphQL collection", async () => {
    const collections = await parseCollectionData(
      getTestJsonFilePath("gql-coll.json", "collection"),
      {}
    );

    expect(collections).toHaveLength(1);
    const requests = collections[0].requests;
    expect(requests).toHaveLength(3);
    expect(requests.every((r) => isGQLRequest(r))).toBe(true);

    const scripted = requests[1];
    if (isGQLRequest(scripted)) {
      expect(scripted.query).toContain("query AuthEcho");
      expect(scripted.preRequestScript).toContain("pw.env.set");
    }
  });


  test("old-version GQL requests migrate to the latest schema on ingestion", async () => {
    // v9 predates responses and the script fields
    const legacyCollection = [
      {
        v: 1,
        name: "Legacy",
        folders: [],
        requests: [
          {
            v: 9,
            name: "Legacy GQL",
            url: "https://echo.hoppscotch.io/graphql",
            headers: [],
            query: "query Hello { method }",
            variables: "{}",
            auth: { authType: "none", authActive: true },
          },
        ],
      },
    ];
    const file = join(
      mkdtempSync(join(tmpdir(), "hopp-gql-migration-")),
      "legacy-coll.json"
    );
    writeFileSync(file, JSON.stringify(legacyCollection));

    const collections = await parseCollectionData(file, {});
    const request = collections[0].requests[0];
    expect(isGQLRequest(request)).toBe(true);
    if (isGQLRequest(request)) {
      expect(request.v).toBe(10);
      expect(request.preRequestScript).toBe("");
      expect(request.testScript).toBe("");
      expect(request.responses).toEqual({});
    }
  });

  test("gql-envs.json is a latest-version environment export", () => {
    const contents = JSON.parse(
      readFileSync(getTestJsonFilePath("gql-envs.json", "environment"), "utf8")
    );

    const parsed = Environment.safeParse(contents);
    expect(parsed.type).toBe("ok");
    if (parsed.type === "ok") {
      expect(parsed.value.v).toBe(2);
      expect(parsed.value.variables).toEqual([
        {
          key: "greeting",
          initialValue: "hello-world",
          currentValue: "hello-world",
          secret: false,
        },
      ]);
    }
  });
});
