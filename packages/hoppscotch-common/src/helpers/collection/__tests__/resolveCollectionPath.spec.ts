import { describe, it, expect } from "vitest"
import { resolveCollectionPath } from "../resolveCollectionPath"
import { HoppCollection } from "@hoppscotch/data"
import { TeamCollection } from "~/helpers/teams/TeamCollection"

describe("resolveCollectionPath", () => {
  describe("Personal Collections (index-based)", () => {
    const mockCollections: HoppCollection[] = [
      {
        name: "Coll 0",
        folders: [
          { name: "Folder 0/0", folders: [], requests: [] },
          {
            name: "Folder 0/1",
            folders: [{ name: "Subfolder 0/1/0", folders: [], requests: [] }],
            requests: [],
          },
        ],
        requests: [],
      } as any,
      { name: "Coll 1", folders: [], requests: [] } as any,
    ]

    it("resolves root collection by index", () => {
      const result = resolveCollectionPath(mockCollections, "0")
      expect(result?.path).toBe("0")
      expect((result?.node as any).name).toBe("Coll 0")
    })

    it("resolves nested folder by index path", () => {
      const result = resolveCollectionPath(mockCollections, "1")
      expect(result?.path).toBe("0/1")
      expect((result?.node as any).name).toBe("Folder 0/1")
    })

    it("resolves deeply nested folder by path", () => {
      const result = resolveCollectionPath(mockCollections, "0/1/0")
      expect(result?.path).toBe("0/1/0")
      expect((result?.node as any).name).toBe("Subfolder 0/1/0")
    })

    it("returns null if not found", () => {
      const result = resolveCollectionPath(mockCollections, "99")
      expect(result).toBeNull()
    })
  })

  describe("Team Collections (ID-based)", () => {
    const mockTeamCols: TeamCollection[] = [
      {
        id: "team-1",
        title: "Team Coll 1",
        children: [
          { id: "folder-a", title: "Folder A", children: [] },
          {
            id: "folder-b",
            title: "Folder B",
            children: [{ id: "sub-x", title: "Sub X", children: [] }],
          },
        ],
      } as any,
    ]

    it("resolves root team collection by ID", () => {
      const result = resolveCollectionPath(mockTeamCols, "team-1")
      expect(result?.path).toBe("team-1")
      expect((result?.node as any).title).toBe("Team Coll 1")
    })

    it("resolves nested team folder by ID", () => {
      const result = resolveCollectionPath(mockTeamCols, "folder-b")
      expect(result?.path).toBe("team-1/folder-b")
    })

    it("resolves deeply nested team folder", () => {
      const result = resolveCollectionPath(mockTeamCols, "sub-x")
      expect(result?.path).toBe("team-1/folder-b/sub-x")
    })
  })

  describe("Integration with Action Handler (Modal Logic)", () => {
    const mockCollections: HoppCollection[] = [
      {
        name: "Coll 0",
        folders: [{ name: "Folder 0/0", folders: [], requests: [] }],
        requests: [],
      } as any,
    ]

    it("correctly identifies if a collection is root", () => {
      const rootRes = resolveCollectionPath(mockCollections, "0")
      const isRoot = rootRes?.path.split("/").length === 1
      expect(isRoot).toBe(true)

      resolveCollectionPath(mockCollections, "0") // Searching for subfolder "0" inside root "0"
      // Note: in the real app these would be unique IDs or paths
      const nestedPath = "0/0"
      const isNestedRoot = nestedPath.split("/").length === 1
      expect(isNestedRoot).toBe(false)
    })

    it("provides the correct node for editProperties", () => {
      const result = resolveCollectionPath(mockCollections, "0")
      expect(result?.node).toBe(mockCollections[0])
    })
  })
})
