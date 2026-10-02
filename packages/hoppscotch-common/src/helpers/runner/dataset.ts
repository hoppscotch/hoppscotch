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

// PapaParse reports notices through the same `errors` array as real failures.
// `UndetectableDelimiter` fires on every single-column file even though the
// parse succeeded, so `Delimiter` errors are never fatal.
const isFatalParseError = (error: Papa.ParseError) => error.type !== "Delimiter"

// PapaParse's `row` base differs by error type: FieldMismatch counts 0-based
// data rows (header excluded, so +2 is the file line), but Quotes errors come
// from the core parser where the header itself is row 0 (so +1).
const formatParseError = (error: Papa.ParseError) =>
  typeof error.row === "number"
    ? `Line ${error.row + (error.type === "Quotes" ? 1 : 2)}: ${error.message}`
    : error.message

const parseCSV = (contents: string): E.Either<string, DatasetRow[]> => {
  const parsed = Papa.parse<Record<string, unknown>>(contents, {
    header: true,
    // "greedy" also drops whitespace-only lines, which plain `true` parses as
    // one-field rows that fail the file with TooFewFields. Trade-off: greedy
    // tests the parsed values (quotes already stripped), so a row whose every
    // field is quoted whitespace (e.g. `"   "`) is dropped too.
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  })

  const fatalErrors = parsed.errors.filter(isFatalParseError)

  if (fatalErrors.length > 0) {
    return E.left(fatalErrors.map(formatParseError).join(", "))
  }

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

    // An empty object is still a valid iteration; don't drop it.
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
