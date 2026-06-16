/**
 * Regression tests for the folder-array mutation bug in processCollection.
 *
 * Root cause (fixed in utils/collections.ts):
 *   `const updatedFolder = { ...folder }` was a shallow copy, so
 *   `updatedFolder.headers` and `updatedFolder.variables` pointed at the
 *   *same* arrays as the original folder.  The subsequent `.push()` calls
 *   permanently mutated the source collection object.  On a second traversal
 *   (multi-iteration run, or any re-use of the same collection objects) the
 *   folder already had the parent's headers/variables pre-appended, causing
 *   duplicates and wrong-precedence resolution.
 *
 * Fix: shallow-copy `headers` and `variables` arrays before pushing.
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import { makeCollection } from "@hoppscotch/data";

// vi.hoisted runs before module import hoisting so the variable is available
// inside vi.mock factory closures.
const { mockAxiosCallable } = vi.hoisted(() => {
  const mockAxiosCallable = vi.fn();
  return { mockAxiosCallable };
});

// `requestRunner` in utils/request.ts calls `axios(config)` directly, so the
// default export must be a callable function.  hopp-fetch.ts calls
// `axios.create()`, so that method must also exist.
vi.mock("axios", () => ({
  default: Object.assign(mockAxiosCallable, {
    create: vi.fn().mockReturnValue(vi.fn()),
    isAxiosError: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock("axios-cookiejar-support", () => ({
  wrapper: (instance: any) => instance,
}));

vi.mock("tough-cookie", () => ({
  CookieJar: vi.fn(),
}));

import axios, { AxiosResponse } from "axios";
import { collectionsRunner } from "../../utils/collections";
import { HoppEnvs } from "../../types/request";

const MOCK_200: AxiosResponse = {
  data: {},
  status: 200,
  statusText: "OK",
  config: { url: "https://example.com", method: "GET" } as any,
  headers: {},
  request: {},
};

const makeRequest = (name: string, overrides: Record<string, unknown> = {}) => ({
  v: "1",
  name,
  method: "GET",
  endpoint: "https://example.com",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: { authActive: false, authType: "none" as const },
  body: { contentType: null, body: null },
  requestVariables: [],
  ...overrides,
});

const EMPTY_ENVS: HoppEnvs = { global: [], selected: [] };

describe("collectionsRunner – folder mutation regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosCallable.mockResolvedValue(MOCK_200);
    (axios as any).create.mockReturnValue(vi.fn());
    (axios as any).isAxiosError.mockReturnValue(false);
  });

  test("folder.headers is not mutated after a single run", async () => {
    const folder = makeCollection({
      name: "folder",
      folders: [],
      requests: [makeRequest("req") as any],
      headers: [{ key: "X-Folder", value: "yes", active: true, description: "" }],
      auth: { authActive: false, authType: "none" },
      variables: [],
    });

    const collection = makeCollection({
      name: "col",
      folders: [folder],
      requests: [],
      headers: [{ key: "X-Parent", value: "parent", active: true, description: "" }],
      auth: { authActive: false, authType: "none" },
      variables: [],
    });

    const originalFolderHeaderCount = folder.headers.length;

    await collectionsRunner({
      collections: [collection],
      envs: EMPTY_ENVS,
    });

    // The folder's header array must remain unchanged
    expect(folder.headers.length).toBe(originalFolderHeaderCount);
    expect(folder.headers.some((h) => h.key === "X-Parent")).toBe(false);
  });

  test("folder.variables is not mutated after a single run", async () => {
    const folder = makeCollection({
      name: "folder",
      folders: [],
      requests: [makeRequest("req") as any],
      headers: [],
      auth: { authActive: false, authType: "none" },
      variables: [{ key: "folderVar", initialValue: "folder", currentValue: "folder", secret: false }],
    });

    const collection = makeCollection({
      name: "col",
      folders: [folder],
      requests: [],
      headers: [],
      auth: { authActive: false, authType: "none" },
      variables: [{ key: "parentVar", initialValue: "parent", currentValue: "parent", secret: false }],
    });

    const originalFolderVariableCount = folder.variables.length;

    await collectionsRunner({
      collections: [collection],
      envs: EMPTY_ENVS,
    });

    expect(folder.variables.length).toBe(originalFolderVariableCount);
    expect(folder.variables.some((v) => v.key === "parentVar")).toBe(false);
  });

  test("multi-iteration run produces consistent folder header count across iterations", async () => {
    const folder = makeCollection({
      name: "folder",
      folders: [],
      requests: [makeRequest("req") as any],
      headers: [{ key: "X-Folder", value: "yes", active: true, description: "" }],
      auth: { authActive: false, authType: "none" },
      variables: [],
    });

    const collection = makeCollection({
      name: "col",
      folders: [folder],
      requests: [],
      headers: [
        { key: "X-Parent-1", value: "a", active: true, description: "" },
        { key: "X-Parent-2", value: "b", active: true, description: "" },
      ],
      auth: { authActive: false, authType: "none" },
      variables: [],
    });

    const originalFolderHeaderCount = folder.headers.length;

    // Run twice with iterationCount=2 to exercise the iteration reset path
    await collectionsRunner({
      collections: [collection],
      envs: EMPTY_ENVS,
      iterationCount: 2,
    });

    // The original folder must remain clean — pre-fix it grew by 2 on every pass
    expect(folder.headers.length).toBe(originalFolderHeaderCount);
    expect(folder.headers.some((h) => h.key === "X-Parent-1")).toBe(false);
    expect(folder.headers.some((h) => h.key === "X-Parent-2")).toBe(false);
  });
});
