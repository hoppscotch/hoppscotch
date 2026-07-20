import { Environment } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import Papa from "papaparse"

export type DatasetFileType = "csv" | "json"

export type DatasetRow = Record<string, string>

export type TestRunnerDataset = {
  fileName: string
  type: DatasetFileType
  rows: DatasetRow[]
}

const getDatasetFileType = (fileName: string): DatasetFileType | null => {
  const extension = fileName.split(".").pop()?.toLowerCase()

  if (extension === "csv" || extension === "json") return extension
  return null
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const stringifyDatasetValue = (value: unknown) => {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") return JSON.stringify(value)

  return String(value)
}

const normalizeRow = (row: Record<string, unknown>): DatasetRow =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => key.trim().length > 0)
      .map(([key, value]) => [key.trim(), stringifyDatasetValue(value)])
  )

const parseCSV = (contents: string): E.Either<string, DatasetRow[]> => {
  const parsed = Papa.parse<Record<string, unknown>>(contents, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    return E.left(parsed.errors.map((error) => error.message).join(", "))
  }

  // Keep every parsed row (blank lines are already dropped via skipEmptyLines).
  // A row with no data columns is still a valid iteration.
  return E.right(parsed.data.map(normalizeRow))
}

const parseJSON = (contents: string): E.Either<string, DatasetRow[]> => {
  try {
    const parsed = JSON.parse(contents)

    if (!Array.isArray(parsed)) {
      return E.left("JSON data file must be an array of objects")
    }

    if (!parsed.every(isPlainObject)) {
      return E.left("JSON data file must contain only objects")
    }

    // Every supplied object is one iteration, including empty objects (an
    // iteration with no data variables); don't drop them.
    return E.right(parsed.map(normalizeRow))
  } catch (error) {
    return E.left(
      error instanceof Error ? error.message : "Invalid JSON data file"
    )
  }
}

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read data file"))
    reader.readAsText(file)
  })

export const parseDatasetFile = async (
  file: File
): Promise<E.Either<string, TestRunnerDataset>> => {
  const type = getDatasetFileType(file.name)

  if (!type) return E.left("Unsupported data file type")

  let contents: string
  try {
    contents = await readFileAsText(file)
  } catch (error) {
    return E.left(
      error instanceof Error ? error.message : "Failed to read data file"
    )
  }

  const parsedRows = type === "csv" ? parseCSV(contents) : parseJSON(contents)

  if (E.isLeft(parsedRows)) return parsedRows

  return E.right({
    fileName: file.name,
    type,
    rows: parsedRows.right,
  })
}

export const datasetRowToTempVars = (
  row: DatasetRow
): Environment["variables"] =>
  Object.entries(row).map(([key, value]) => ({
    key,
    initialValue: value,
    currentValue: value,
    secret: false,
  }))
