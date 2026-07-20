import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import {
  HoppTestRunnerDocument,
  TestRunnerIterationResult,
  TestRunnerMeta,
} from "~/helpers/rest/document"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "~/helpers/types/HoppTestResult"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"
import { platform } from "~/platform"

/**
 * Controls how response bodies are serialized into the report:
 * - "base64": binary-safe, capped at BODY_CAP_BYTES (used for the DB report)
 * - "readable": UTF-8 string for text bodies, base64 fallback for binary (used for the export file)
 * - "none": bodies omitted entirely (used for the local metadata-only cache)
 */
export type RunnerBodyMode = "base64" | "readable" | "none"

const BODY_CAP_BYTES = 300_000

export type ExportedAssertion = {
  description: string
  status: "pass" | "fail" | "error"
  message: string
}

export type ExportedResponse = {
  type: HoppRESTResponse["type"]
  statusCode?: number
  statusText?: string
  durationInMs?: number
  sizeInBytes?: number
  headers?: { key: string; value: string }[]
  body?: string
  bodyEncoding?: "utf-8" | "base64"
  bodyOmittedReason?: "too-large" | "not-persisted"
  error?: string
}

export type ExportedRequest = {
  name: string
  method: string
  endpoint: string
  passedTests: number
  failedTests: number
  error?: string
  assertions: ExportedAssertion[]
  response?: ExportedResponse
}

export type ExportedSummary = {
  totalRequests: number
  completedRequests: number
  totalTests: number
  passedTests: number
  failedTests: number
  totalTimeInMs: number
}

export type ExportedIteration = {
  iteration: number
  summary: ExportedSummary
  requests: ExportedRequest[]
}

export type CollectionRunType = "PERSONAL" | "SHARED"

export type CollectionRunOutcome = "passed" | "failed" | "errored"

const COLLECTION_RUN_TYPE_LABELS: Record<CollectionRunType, string> = {
  PERSONAL: "Personal Collection",
  SHARED: "Shared Collection",
}

export const collectionRunTypeLabel = (type: CollectionRunType): string =>
  COLLECTION_RUN_TYPE_LABELS[type] ?? type

export type RunnerResultReport = {
  collectionID: string
  collectionName: string
  collectionType: CollectionRunType
  environment: string
  outcome: CollectionRunOutcome
  exportedAt: string
  config: {
    iterations: number
    delayInMs: number
    stopOnError: boolean
    persistResponses: boolean
    keepVariableValues: boolean
    dataFile?: string
  }
  summary: ExportedSummary
  iterationResults: ExportedIteration[]
}

const toSummary = (meta: TestRunnerMeta): ExportedSummary => ({
  totalRequests: meta.totalRequests,
  completedRequests: meta.completedRequests,
  totalTests: meta.totalTests,
  passedTests: meta.passedTests,
  failedTests: meta.failedTests,
  totalTimeInMs: meta.totalTime,
})

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

const getContentType = (headers: { key: string; value: string }[]): string =>
  headers.find((header) => header.key.toLowerCase() === "content-type")
    ?.value ?? ""

const isTextContentType = (contentType: string): boolean =>
  /\b(json|xml|html|javascript|csv)\b/i.test(contentType) ||
  /^text\//i.test(contentType)

const serializeBody = (
  body: ArrayBuffer,
  headers: { key: string; value: string }[],
  mode: RunnerBodyMode
): Pick<ExportedResponse, "body" | "bodyEncoding" | "bodyOmittedReason"> => {
  if (mode === "none") return {}

  if (mode === "base64") {
    if (body.byteLength > BODY_CAP_BYTES)
      return { bodyOmittedReason: "too-large" }
    return { body: arrayBufferToBase64(body), bodyEncoding: "base64" }
  }

  // mode === "readable"
  if (isTextContentType(getContentType(headers))) {
    return { body: new TextDecoder().decode(body), bodyEncoding: "utf-8" }
  }
  return { body: arrayBufferToBase64(body), bodyEncoding: "base64" }
}

const flattenAssertions = (tests: HoppTestData[]): ExportedAssertion[] =>
  tests.flatMap((test) => [
    ...test.expectResults.map((result) => ({
      description: test.description,
      status: result.status,
      message: result.message,
    })),
    ...flattenAssertions(test.tests),
  ])

const collectAssertions = (
  testResults: HoppTestResult | null | undefined
): ExportedAssertion[] => {
  if (!testResults) return []
  return [
    ...testResults.expectResults.map((result) => ({
      description: testResults.description,
      status: result.status,
      message: result.message,
    })),
    ...flattenAssertions(testResults.tests),
  ]
}

const exportResponse = (
  response: HoppRESTResponse | null | undefined,
  bodyMode: RunnerBodyMode
): ExportedResponse | undefined => {
  if (!response) return undefined

  // The kernel REST layer emits `"fail"` for HTTP error responses (4xx/5xx),
  // even though the legacy `HoppRESTResponse` union still calls it `"failure"`.
  // Match `"fail"` so error iterations keep their status/body/meta in the export
  // (every other runner code path keys off `"fail"` too).
  if (response.type === "success" || response.type === "fail") {
    return {
      type: response.type,
      statusCode: response.statusCode,
      statusText: response.statusText,
      durationInMs: response.meta.responseDuration,
      sizeInBytes: response.meta.responseSize,
      headers: response.headers,
      ...serializeBody(response.body, response.headers, bodyMode),
    }
  }

  return {
    type: response.type,
    error:
      "error" in response
        ? String((response as { error: unknown }).error)
        : undefined,
  }
}

const exportRequest = (
  request: TestRunnerRequest,
  bodyMode: RunnerBodyMode
): ExportedRequest => ({
  name: request.name,
  method: request.method,
  endpoint: request.endpoint,
  passedTests: request.passedTests,
  failedTests: request.failedTests,
  error: request.error,
  assertions: collectAssertions(request.testResults),
  response: exportResponse(request.response, bodyMode),
})

const exportCollectionRequests = (
  collection: HoppCollection,
  bodyMode: RunnerBodyMode
): ExportedRequest[] => [
  ...collection.requests.map((request) =>
    exportRequest(request as TestRunnerRequest, bodyMode)
  ),
  ...collection.folders.flatMap((folder) =>
    exportCollectionRequests(folder, bodyMode)
  ),
]

const exportIteration = (
  iterationResult: TestRunnerIterationResult,
  bodyMode: RunnerBodyMode
): ExportedIteration => ({
  iteration: iterationResult.iteration,
  summary: toSummary(iterationResult.meta),
  requests: exportCollectionRequests(
    iterationResult.resultCollection,
    bodyMode
  ),
})

const collectionHasRequestError = (collection: HoppCollection): boolean =>
  collection.requests.some((request) =>
    Boolean((request as TestRunnerRequest).error)
  ) || collection.folders.some(collectionHasRequestError)

const deriveOutcome = (
  document: HoppTestRunnerDocument
): "passed" | "failed" | "errored" => {
  if (document.status === "error") return "errored"

  const hasRequestError = (document.iterationResults ?? []).some((iteration) =>
    collectionHasRequestError(iteration.resultCollection)
  )

  return document.testRunnerMeta.failedTests > 0 || hasRequestError
    ? "failed"
    : "passed"
}

export type RunnerExportScope = "all" | "current"

export const buildRunnerResultReport = (
  document: HoppTestRunnerDocument,
  scope: RunnerExportScope,
  bodyMode: RunnerBodyMode
): RunnerResultReport => {
  const allIterations = document.iterationResults ?? []
  const selectedIndex = document.selectedIteration ?? 0

  const iterations =
    scope === "current"
      ? allIterations.filter((_, index) => index === selectedIndex)
      : allIterations

  return {
    collectionID: document.collectionID,
    collectionName: document.collection.name,
    collectionType:
      document.collectionType === "my-collections" ? "PERSONAL" : "SHARED",
    environment: document.environmentName ?? "Global",
    outcome: deriveOutcome(document),
    exportedAt: new Date().toISOString(),
    config: {
      iterations: document.config.iterations,
      delayInMs: document.config.delay,
      stopOnError: document.config.stopOnError,
      persistResponses: document.config.persistResponses,
      keepVariableValues: document.config.keepVariableValues,
      dataFile: document.config.dataset?.fileName,
    },
    summary: toSummary(document.testRunnerMeta),
    iterationResults: iterations.map((iteration) =>
      exportIteration(iteration, bodyMode)
    ),
  }
}

const decodeBase64Text = (base64: string): string | null => {
  try {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

const base64ToReadableResponse = (response: ExportedResponse): void => {
  if (response.bodyEncoding !== "base64" || response.body === undefined) return
  if (!isTextContentType(getContentType(response.headers ?? []))) return

  const decoded = decodeBase64Text(response.body)
  if (decoded === null) return

  response.body = decoded
  response.bodyEncoding = "utf-8"
}

/**
 * Returns a display string for a stored response body. Base64 text bodies are
 * decoded to UTF-8; binary (non-text) bodies are left as base64 so the viewer
 * can still surface them.
 */
export const getDisplayBody = (
  response: ExportedResponse
): { body: string; isBinary: boolean } | null => {
  if (response.body === undefined) return null

  if (response.bodyEncoding !== "base64") {
    return { body: response.body, isBinary: false }
  }

  if (!isTextContentType(getContentType(response.headers ?? []))) {
    return { body: response.body, isBinary: true }
  }

  const decoded = decodeBase64Text(response.body)
  if (decoded === null) return { body: response.body, isBinary: true }

  return { body: decoded, isBinary: false }
}

/**
 * Re-encodes a stored (base64-body) report into the readable export format so
 * exported files never contain base64 text bodies. Binary bodies stay base64.
 */
/**
 * The exported file uses a human-readable collectionType label while the
 * stored report keeps a stable code.
 */
type ExportedReport = Omit<RunnerResultReport, "collectionType"> & {
  collectionType: string
}

export const reencodeReportForExport = (
  report: RunnerResultReport
): ExportedReport => {
  const clone: RunnerResultReport = JSON.parse(JSON.stringify(report))
  clone.iterationResults.forEach((iteration) =>
    iteration.requests.forEach((request) => {
      if (request.response) base64ToReadableResponse(request.response)
    })
  )
  return {
    ...clone,
    collectionType: collectionRunTypeLabel(clone.collectionType),
  }
}

const saveReport = async (report: ExportedReport, filename: string) => {
  const result = await platform.kernelIO.saveFileWithDialog({
    data: JSON.stringify(report, null, 2),
    contentType: "application/json",
    suggestedFilename: filename,
    filters: [
      {
        name: "Hoppscotch Collection Run Results JSON file",
        extensions: ["json"],
      },
    ],
  })

  if (result.type === "unknown" || result.type === "saved") {
    return E.right("state.download_started")
  }

  return E.left("state.download_failed")
}

export const exportRunnerResults = async (
  document: HoppTestRunnerDocument,
  scope: RunnerExportScope
) =>
  saveReport(
    reencodeReportForExport(
      buildRunnerResultReport(document, scope, "readable")
    ),
    `${document.collection.name || "collection"}-run.json`
  )

export const exportRunnerReport = async (report: RunnerResultReport) =>
  saveReport(
    reencodeReportForExport(report),
    `${report.collectionName || "collection"}-run.json`
  )
