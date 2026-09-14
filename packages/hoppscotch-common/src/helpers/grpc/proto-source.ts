import type { GRPCProtoFile } from "@hoppscotch/data"

export const normalizeGRPCProtoPath = (path: string): string => {
  const parts: string[] = []

  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") continue
    if (part === "..") parts.pop()
    else parts.push(part)
  }

  return parts.join("/")
}

const stripRootDirectory = (path: string): string => {
  const normalized = normalizeGRPCProtoPath(path)
  const separator = normalized.indexOf("/")
  return separator === -1 ? normalized : normalized.slice(separator + 1)
}

const readFileText = (file: File): Promise<string> => {
  if (typeof file.text === "function") return file.text()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")))
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error(`Unable to read ${file.name}`))
    )
    reader.readAsText(file)
  })
}

export async function readGRPCProtoFiles(
  selectedFiles: Iterable<File>,
  options: { stripRootDirectory?: boolean } = {}
): Promise<GRPCProtoFile[]> {
  const protoFiles = [...selectedFiles].filter((file) =>
    file.name.toLowerCase().endsWith(".proto")
  )

  return Promise.all(
    protoFiles.map(async (file) => {
      const selectedPath = file.webkitRelativePath || file.name
      const name = options.stripRootDirectory
        ? stripRootDirectory(selectedPath)
        : normalizeGRPCProtoPath(selectedPath)

      return { name, content: await readFileText(file) }
    })
  )
}

export const mergeGRPCProtoFiles = (
  currentFiles: GRPCProtoFile[],
  incomingFiles: GRPCProtoFile[]
): GRPCProtoFile[] => {
  const merged = new Map(
    currentFiles.map((file) => [
      normalizeGRPCProtoPath(file.name),
      { ...file, name: normalizeGRPCProtoPath(file.name) },
    ])
  )

  for (const file of incomingFiles) {
    const name = normalizeGRPCProtoPath(file.name)
    merged.set(name, { ...file, name })
  }

  return [...merged.values()]
}

export function createPastedGRPCProtoFile(
  filename: string,
  content: string
): GRPCProtoFile {
  const name = normalizeGRPCProtoPath(filename.trim())

  if (!name) throw new Error("Enter a filename")
  if (!name.toLowerCase().endsWith(".proto")) {
    throw new Error("The filename must end with .proto")
  }
  if (!content.trim()) throw new Error("Paste a proto definition")

  return { name, content }
}
