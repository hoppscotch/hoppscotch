import { Environment, getDefaultRESTRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";
import { describe, expect, test } from "vitest";

import { getEffectiveRESTRequest } from "../../utils/pre-request";

const EMPTY_ENV = <Environment>{
  v: 1,
  id: "env-id",
  name: "name",
  variables: [],
};

const getJSONRequest = (body: string) => ({
  ...getDefaultRESTRequest(),
  body: { contentType: "application/json" as const, body },
});

const getEffectiveFinalBody = async (body: string, env = EMPTY_ENV) => {
  const result = await getEffectiveRESTRequest(getJSONRequest(body), env);

  if (E.isLeft(result)) {
    throw new Error(`Expected Right, got Left: ${JSON.stringify(result.left)}`);
  }

  return result.right.effectiveRequest.effectiveFinalBody;
};

describe("getEffectiveRESTRequest", () => {
  describe("JSON body numeric precision", () => {
    test("preserves integers beyond Number.MAX_SAFE_INTEGER in the final body", async () => {
      expect(
        await getEffectiveFinalBody(
          '{"id": 9007199254740993, "bigId": 99999999999999999}'
        )
      ).toBe('{"id":9007199254740993,"bigId":99999999999999999}');
    });

    test("preserves large integers nested in objects and arrays", async () => {
      expect(
        await getEffectiveFinalBody(
          '{"data": {"ids": [9007199254740993, 1], "id": 99999999999999999}}'
        )
      ).toBe('{"data":{"ids":[9007199254740993,1],"id":99999999999999999}}');
    });

    test("preserves large integers while stripping comments and trailing commas", async () => {
      expect(
        await getEffectiveFinalBody(
          '{\n  // large id\n  "id": 9007199254740993, /* trailing */\n}'
        )
      ).toBe('{"id":9007199254740993}');
    });

    test("preserves large integers substituted from environment variables", async () => {
      expect(
        await getEffectiveFinalBody('{"id": <<BIG_ID>>}', <Environment>{
          ...EMPTY_ENV,
          variables: [
            {
              key: "BIG_ID",
              initialValue: "",
              currentValue: "9007199254740993",
              secret: false,
            },
          ],
        })
      ).toBe('{"id":9007199254740993}');
    });

    test("does not alter integers within the safe range", async () => {
      expect(
        await getEffectiveFinalBody('{"id": 123, "neg": -456, "f": 1.5}')
      ).toBe('{"id":123,"neg":-456,"f":1.5}');
    });

    test("returns PARSING_ERROR for invalid JSON body", async () => {
      const result = await getEffectiveRESTRequest(
        getJSONRequest('{"id": }'),
        EMPTY_ENV
      );

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.code).toBe("PARSING_ERROR");
      }
    });
  });
});
