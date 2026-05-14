import type { Environment } from "@hoppscotch/data"

export type IterationDataRow = Environment["variables"]

type JsonIterationRow = Record<string, unknown>

const toEnvValue = (value: unknown) => {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

const toIterationRow = (row: JsonIterationRow): IterationDataRow =>
  Object.entries(row)
    .filter(([key]) => key.trim().length > 0)
    .map(([key, value]) => ({
      key,
      initialValue: toEnvValue(value),
      currentValue: toEnvValue(value),
      secret: false,
    }))

export const parseJSONIterationData = (content: string): IterationDataRow[] => {
  const parsed = JSON.parse(content)

  if (Array.isArray(parsed)) {
    return parsed.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error("JSON iteration data must be an array of objects")
      }

      return toIterationRow(row)
    })
  }

  if (parsed && typeof parsed === "object") {
    return [toIterationRow(parsed)]
  }

  throw new Error("JSON iteration data must be an object or array of objects")
}

const parseCSVRows = (content: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let insideQuotes = false

  for (let index = 0; index < content.length; index++) {
    const char = content[index]
    const nextChar = content[index + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cell += '"'
        index++
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === "," && !insideQuotes) {
      row.push(cell)
      cell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)

  return rows.filter((csvRow) =>
    csvRow.some((csvCell) => csvCell.trim().length > 0)
  )
}

export const parseCSVIterationData = (content: string): IterationDataRow[] => {
  const rows = parseCSVRows(content)

  if (rows.length < 2) {
    throw new Error(
      "CSV iteration data must include a header and at least one data row"
    )
  }

  const headers = rows[0].map((header) => header.trim())

  if (headers.every((header) => header.length === 0)) {
    throw new Error("CSV iteration data must include at least one header")
  }

  return rows.slice(1).map((row) =>
    headers
      .map((header, index) => ({
        key: header,
        initialValue: row[index] ?? "",
        currentValue: row[index] ?? "",
        secret: false,
      }))
      .filter(({ key }) => key.length > 0)
  )
}

export const parseIterationDataFile = (
  content: string,
  filename: string
): IterationDataRow[] => {
  const normalizedName = filename.toLowerCase()

  if (normalizedName.endsWith(".json")) return parseJSONIterationData(content)
  if (normalizedName.endsWith(".csv")) return parseCSVIterationData(content)

  throw new Error("Unsupported iteration data file type")
}
