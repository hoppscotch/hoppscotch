/**
 * JSON Response Compression and Decompression Utilities
 * 
 * Provides compression support for large JSON responses to reduce
 * bandwidth and improve transfer times.
 */

export interface CompressionStats {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  timeToCompress: number
  timeToDecompress: number
  algorithm: string
}

/**
 * Compress JSON string using gzip
 */
export async function compressJSON(json: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(json)

  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(data)
  writer.close()

  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[]))
}

/**
 * Decompress gzip compressed JSON
 */
export async function decompressJSON(compressed: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(compressed)
  writer.close()

  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const combined = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[]))
  const decoder = new TextDecoder()
  return decoder.decode(combined)
}

/**
 * Measure compression effectiveness
 */
export async function measureCompression(json: string): Promise<CompressionStats> {
  const originalSize = new Blob([json]).size

  const startCompress = performance.now()
  const compressed = await compressJSON(json)
  const timeToCompress = performance.now() - startCompress

  const compressedSize = compressed.byteLength
  const compressionRatio = (1 - compressedSize / originalSize) * 100

  const startDecompress = performance.now()
  const decompressed = await decompressJSON(compressed)
  const timeToDecompress = performance.now() - startDecompress

  return {
    originalSize,
    compressedSize,
    compressionRatio,
    timeToCompress,
    timeToDecompress,
    algorithm: 'gzip',
  }
}

/**
 * Estimate compression benefit before compressing
 */
export function estimateCompressionBenefit(json: string): {
  estimated: number
  shouldCompress: boolean
} {
  // Heuristic: compression typically achieves 60-80% ratio for repetitive JSON
  const estimated = json.length * 0.3 // Estimate 70% reduction
  const shouldCompress = json.length > 50000 // Only compress if > 50KB

  return { estimated, shouldCompress }
}

/**
 * JSON Minification for size reduction
 */
export function minifyJSON(json: string): string {
  try {
    const parsed = JSON.parse(json)
    return JSON.stringify(parsed) // No spaces
  } catch {
    return json
  }
}

/**
 * JSON Pretty Printing
 */
export function prettyPrintJSON(json: string | object, indent: number = 2): string {
  const obj = typeof json === 'string' ? JSON.parse(json) : json
  return JSON.stringify(obj, null, indent)
}

/**
 * Check if JSON is compressible
 */
export function isCompressible(json: string): boolean {
  // Less than 1KB usually doesn't benefit from compression
  // JSON with little repetition won't compress well
  return json.length > 1000
}

/**
 * Calculate estimated transfer time
 */
export function estimateTransferTime(
  jsonSize: number,
  bandwidthMbps: number = 10
): {
  uncompressed: number
  compressed: number
  savings: number
} {
  const uncompressedSeconds = (jsonSize * 8) / (bandwidthMbps * 1000 * 1000)
  const compressedSize = jsonSize * 0.3 // Estimate 70% compression
  const compressedSeconds = (compressedSize * 8) / (bandwidthMbps * 1000 * 1000)

  return {
    uncompressed: uncompressedSeconds * 1000, // Convert to ms
    compressed: compressedSeconds * 1000,
    savings: (uncompressedSeconds - compressedSeconds) * 1000,
  }
}
