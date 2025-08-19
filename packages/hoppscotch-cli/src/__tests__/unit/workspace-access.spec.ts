import { describe, expect, test } from "vitest";

import {
  transformWorkspaceCollections,
  transformWorkspaceEnvironment,
} from "../../utils/workspace-access";
import {
  TRANSFORMED_COLLECTIONS_WITHOUT_AUTH_HEADERS_VARIABLES_AT_CERTAIN_LEVELS_MOCK,
  TRANSFORMED_DEEPLY_NESTED_COLLECTIONS_WITH_AUTH_HEADERS_VARIABLES_MOCK,
  TRANSFORMED_ENVIRONMENT_V0_FORMAT_MOCK,
  TRANSFORMED_ENVIRONMENT_V1_FORMAT_MOCK,
  TRANSFORMED_ENVIRONMENT_V2_FORMAT_MOCK,
  TRANSFORMED_MULTIPLE_CHILD_COLLECTIONS_WITH_AUTH_HEADERS_MOCK,
  WORKSPACE_COLLECTIONS_WITHOUT_AUTH_HEADERS_VARIABLES_AT_CERTAIN_LEVELS_MOCK,
  WORKSPACE_DEEPLY_NESTED_COLLECTIONS_WITH_AUTH_HEADERS_VARIABLES_MOCK,
  WORKSPACE_ENVIRONMENT_V0_FORMAT_MOCK,
  WORKSPACE_ENVIRONMENT_V1_FORMAT_MOCK,
  WORKSPACE_ENVIRONMENT_V2_FORMAT_MOCK,
  WORKSPACE_MULTIPLE_CHILD_COLLECTIONS_WITH_AUTH_HEADERS_VARIABLES_MOCK,
} from "./fixtures/workspace-access.mock";

describe("workspace-access", () => {
  describe("transformWorkspaceCollection", () => {
    test("Successfully transforms collection data with deeply nested collections and authorization/headers set at each level to the `HoppCollection` format", () => {
      expect(
        transformWorkspaceCollections(
          WORKSPACE_DEEPLY_NESTED_COLLECTIONS_WITH_AUTH_HEADERS_VARIABLES_MOCK
        )
      ).toEqual(
        TRANSFORMED_DEEPLY_NESTED_COLLECTIONS_WITH_AUTH_HEADERS_VARIABLES_MOCK
      );
    });

    test("Successfully transforms collection data with multiple child collections and authorization/headers set at each level to the `HoppCollection` format", () => {
      expect(
        transformWorkspaceCollections(
          WORKSPACE_MULTIPLE_CHILD_COLLECTIONS_WITH_AUTH_HEADERS_VARIABLES_MOCK
        )
      ).toEqual(TRANSFORMED_MULTIPLE_CHILD_COLLECTIONS_WITH_AUTH_HEADERS_MOCK);
    });

    test("Adds the default value for `auth` & `header` fields while transforming collections without authorization/headers set at certain levels", () => {
      expect(
        transformWorkspaceCollections(
          WORKSPACE_COLLECTIONS_WITHOUT_AUTH_HEADERS_VARIABLES_AT_CERTAIN_LEVELS_MOCK
        )
      ).toEqual(
        TRANSFORMED_COLLECTIONS_WITHOUT_AUTH_HEADERS_VARIABLES_AT_CERTAIN_LEVELS_MOCK
      );
    });
  });

  describe("transformWorkspaceEnvironment", () => {
    test("Successfully transforms environment data conforming to the `v0` format received from the network call to the `HoppEnvironment` format", () => {
      expect(
        // @ts-expect-error: Testing legacy format transformation
        transformWorkspaceEnvironment(WORKSPACE_ENVIRONMENT_V0_FORMAT_MOCK)
      ).toEqual(TRANSFORMED_ENVIRONMENT_V0_FORMAT_MOCK);
    });

    test("Successfully transforms environment data conforming to the `v1` format received from the network call to the `HoppEnvironment` format", () => {
      expect(
        // @ts-expect-error: Testing legacy format transformation
        transformWorkspaceEnvironment(WORKSPACE_ENVIRONMENT_V1_FORMAT_MOCK)
      ).toEqual(TRANSFORMED_ENVIRONMENT_V1_FORMAT_MOCK);
    });

    test("Successfully transforms environment data conforming to the `v2` format received from the network call to the `HoppEnvironment` format", () => {
      expect(
        transformWorkspaceEnvironment(WORKSPACE_ENVIRONMENT_V2_FORMAT_MOCK)
      ).toEqual(TRANSFORMED_ENVIRONMENT_V2_FORMAT_MOCK);
    });
  });
});
