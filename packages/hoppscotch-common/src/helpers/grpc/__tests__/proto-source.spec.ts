import { describe, expect, test } from "vitest"
import {
  createPastedGRPCProtoFile,
  mergeGRPCProtoFiles,
  normalizeGRPCProtoPath,
  readGRPCProtoFiles,
} from "../proto-source"

const fileWithPath = (
  name: string,
  content: string,
  relativePath = ""
): File => {
  const file = new File([content], name)
  Object.defineProperty(file, "webkitRelativePath", { value: relativePath })
  return file
}

describe("gRPC proto sources", () => {
  test("normalizes separators and parent path segments", () => {
    expect(normalizeGRPCProtoPath("proto\\service/../messages.proto")).toBe(
      "proto/messages.proto"
    )
  })

  test("reads multiple selected proto files", async () => {
    const files = await readGRPCProtoFiles([
      fileWithPath("service.proto", "service"),
      fileWithPath("messages.proto", "messages"),
      fileWithPath("notes.txt", "ignored"),
    ])

    expect(files).toEqual([
      { name: "service.proto", content: "service" },
      { name: "messages.proto", content: "messages" },
    ])
  })

  test("strips the selected folder root and preserves nested paths", async () => {
    const files = await readGRPCProtoFiles(
      [
        fileWithPath("service.proto", "service", "project/proto/service.proto"),
        fileWithPath(
          "types.proto",
          "types",
          "project/proto/common/types.proto"
        ),
      ],
      { stripRootDirectory: true }
    )

    expect(files.map((file) => file.name)).toEqual([
      "proto/service.proto",
      "proto/common/types.proto",
    ])
  })

  test("returns no entries for a folder without proto files", async () => {
    const files = await readGRPCProtoFiles(
      [fileWithPath("README.md", "ignored", "project/README.md")],
      { stripRootDirectory: true }
    )

    expect(files).toEqual([])
  })

  test("replaces a file with the same normalized path", () => {
    expect(
      mergeGRPCProtoFiles(
        [{ name: "common\\types.proto", content: "old" }],
        [{ name: "common/types.proto", content: "new" }]
      )
    ).toEqual([{ name: "common/types.proto", content: "new" }])
  })

  test("validates pasted proto definitions", () => {
    expect(
      createPastedGRPCProtoFile("service.proto", "syntax = 'proto3';")
    ).toEqual({
      name: "service.proto",
      content: "syntax = 'proto3';",
    })
    expect(() => createPastedGRPCProtoFile("service.txt", "content")).toThrow(
      "The filename must end with .proto"
    )
    expect(() => createPastedGRPCProtoFile("service.proto", " ")).toThrow(
      "Paste a proto definition"
    )
  })
})
