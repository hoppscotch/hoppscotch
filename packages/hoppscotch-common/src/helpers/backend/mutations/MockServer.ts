import * as TE from "fp-ts/TaskEither"

// Types for mock server
export type MockServer = {
  id: string
  name: string
  subdomain: string
  userUid: string
  collectionID: string
  isActive: boolean
  createdOn: Date
  updatedOn: Date
}

type CreateMockServerError =
  | "mock_server/invalid_collection_id"
  | "mock_server/name_too_short"
  | "mock_server/limit_exceeded"

type UpdateMockServerError =
  | "mock_server/not_found"
  | "mock_server/access_denied"

type DeleteMockServerError =
  | "mock_server/not_found"
  | "mock_server/access_denied"

// Mock implementation - replace with actual GraphQL calls when backend is ready
const generateMockId = () => Math.random().toString(36).substr(2, 9)
const generateSubdomain = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substr(0, 20)

export const createMockServer = (name: string, collectionID: string) =>
  TE.of<CreateMockServerError, MockServer>({
    id: generateMockId(),
    name,
    subdomain: generateSubdomain(name),
    userUid: "current-user-uid",
    collectionID,
    isActive: false,
    createdOn: new Date(),
    updatedOn: new Date(),
  })

export const updateMockServer = (
  id: string,
  input: { name?: string; isActive?: boolean }
) =>
  TE.of<UpdateMockServerError, MockServer>({
    id,
    name: input.name || "Mock Server",
    subdomain: input.name ? generateSubdomain(input.name) : "mock-server",
    userUid: "current-user-uid",
    collectionID: "collection-id",
    isActive: input.isActive || false,
    createdOn: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedOn: new Date(),
  })

export const deleteMockServer = (id: string) =>
  TE.of<DeleteMockServerError, boolean>(true)

// Query functions for fetching mock servers
export const getMockServersByCollection = (collectionID: string) =>
  TE.of<string, MockServer[]>([])

export const getMockServer = (id: string) =>
  TE.of<string, MockServer>({
    id,
    name: "Mock Server",
    subdomain: "mock-server",
    userUid: "current-user-uid",
    collectionID: "collection-id",
    isActive: false,
    createdOn: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedOn: new Date(),
  })
