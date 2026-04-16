import * as E from "fp-ts/Either"
import { md5 } from "js-md5"

import { getService } from "~/modules/dioc"
import { getI18n } from "~/modules/i18n"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

export interface DigestAuthParams {
  username: string
  password: string
  realm: string
  nonce: string
  endpoint: string
  method: string
  algorithm: string
  qop: string
  nc?: string
  opaque?: string
  cnonce?: string // client nonce (optional but typically required in qop='auth')
  reqBody?: string
}

// Function to generate Digest Auth Header
export async function generateDigestAuthHeader(params: DigestAuthParams) {
  const {
    username,
    password,
    realm,
    nonce,
    endpoint,
    method,
    algorithm = "MD5",
    qop,
    nc = "00000001",
    opaque,
    cnonce,
    reqBody = " ",
  } = params

  const url = new URL(endpoint)
  const uri = url.pathname + url.search

  // Generate client nonce if not provided
  const generatedCnonce = cnonce || md5(`${Math.random()}`)

  // Step 1: Hash the username, realm, password and any additional fields based on the algorithm
  const ha1 =
    algorithm === "MD5-sess"
      ? md5(
          `${md5(`${username}:${realm}:${password}`)}:${nonce}:${generatedCnonce}`
        )
      : md5(`${username}:${realm}:${password}`)

  // Step 2: Hash the method and URI
  const ha2 =
    qop === "auth-int"
      ? md5(`${method}:${uri}:${md5(reqBody)}`) // Entity body hash for `auth-int`
      : md5(`${method}:${uri}`)

  // Step 3: Compute the response hash
  const response = md5(`${ha1}:${nonce}:${nc}:${generatedCnonce}:${qop}:${ha2}`)

  // Build the Digest header
  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", algorithm="${algorithm}", response="${response}", qop=${qop}, nc=${nc}, cnonce="${generatedCnonce}"`

  if (opaque) {
    authHeader += `, opaque="${opaque}"`
  }

  return authHeader
}

export interface DigestAuthInfo {
  realm: string
  nonce: string
  qop: string
  opaque?: string
  algorithm: string
}

type DigestAuthHeaderParams = Record<string, string>

function extractDigestChallenge(header: string) {
  let index = 0

  while (index < header.length) {
    while (index < header.length && /[\s,]/.test(header[index])) {
      index++
    }

    if (
      header.slice(index, index + 6).toLowerCase() === "digest" &&
      /\s/.test(header[index + 6] ?? "")
    ) {
      return header.slice(index + 6).trim()
    }

    let inQuotes = false

    while (index < header.length) {
      const char = header[index]

      if (char === "\\" && inQuotes) {
        index += 2
        continue
      }

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (!inQuotes && char === ",") {
        index++
        break
      }

      index++
    }
  }

  return header.trim()
}

export async function fetchInitialDigestAuthInfo(
  url: string,
  method: string
): Promise<DigestAuthInfo> {
  const t = getI18n()

  try {
    const interceptorService = getService(KernelInterceptorService)
    const exec = await interceptorService.execute({
      id: Date.now(),
      url,
      method,
      version: "HTTP/1.1",
    })

    const initialResponse = await exec.response

    if (E.isLeft(initialResponse)) {
      const initialFetchFailureReason =
        initialResponse.left === "cancellation"
          ? initialResponse.left
          : initialResponse.left.humanMessage.heading(t)

      throw new Error(initialFetchFailureReason)
    }

    // Check if the response status is 401 (which is expected in Digest Auth flow)
    if (initialResponse.right.status === 401) {
      const authHeaderEntry = Object.keys(initialResponse.right.headers).find(
        (header) => header.toLowerCase() === "www-authenticate"
      )

      const authHeader = authHeaderEntry
        ? (initialResponse.right.headers[authHeaderEntry] ?? null)
        : null

      if (authHeader) {
        const authParams = parseDigestAuthHeader(authHeader)
        if (
          authParams &&
          authParams.realm &&
          authParams.nonce &&
          authParams.qop
        ) {
          return {
            realm: authParams.realm,
            nonce: authParams.nonce,
            qop: authParams.qop,
            opaque: authParams.opaque,
            algorithm: authParams.algorithm ?? "MD5",
          }
        }
      }

      throw new Error(
        "Failed to parse authentication parameters from WWW-Authenticate header"
      )
    }

    throw new Error(`Unexpected response: ${initialResponse.right.status}`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : error

    console.error(`Failed to fetch initial Digest Auth info: ${errMsg}`)

    throw error // Re-throw the error to handle it further up the chain if needed
  }
}

// Utility function to parse Digest auth header values
function parseDigestAuthHeader(header: string): DigestAuthHeaderParams | null {
  const digestHeader = extractDigestChallenge(header)

  if (!digestHeader) return null

  const authParams: DigestAuthHeaderParams = {}
  let index = 0

  while (index < digestHeader.length) {
    while (index < digestHeader.length && /[\s,]/.test(digestHeader[index])) {
      index++
    }

    if (index >= digestHeader.length) break

    const keyStart = index

    while (
      index < digestHeader.length &&
      digestHeader[index] !== "=" &&
      digestHeader[index] !== ","
    ) {
      index++
    }

    const key = digestHeader.slice(keyStart, index).trim().toLowerCase()

    if (!key || digestHeader[index] !== "=") {
      if (index === keyStart) index++
      continue
    }

    index++

    while (index < digestHeader.length && /\s/.test(digestHeader[index])) {
      index++
    }

    let value = ""

    if (digestHeader[index] === '"') {
      index++

      while (index < digestHeader.length) {
        const char = digestHeader[index]

        if (char === "\\") {
          index++

          if (index < digestHeader.length) {
            value += digestHeader[index]
            index++
          }

          continue
        }

        if (char === '"') {
          index++
          break
        }

        value += char
        index++
      }
    } else {
      const valueStart = index

      while (index < digestHeader.length) {
        if (digestHeader[index] !== ",") {
          index++
          continue
        }

        if (key !== "qop") break

        const rest = digestHeader.slice(index + 1)

        if (/^\s*[a-z0-9_-]+\s*=/i.test(rest)) break

        index++
      }

      value = digestHeader.slice(valueStart, index).trim()
    }

    authParams[key] = normalizeDigestAuthValue(key, value)
  }

  return Object.keys(authParams).length > 0 ? authParams : null
}

function normalizeDigestAuthValue(key: string, value: string) {
  if (key === "qop") {
    return selectDigestQop(value)
  }

  if (key === "algorithm") {
    return normalizeDigestAlgorithm(value)
  }

  return value
}

function selectDigestQop(value: string) {
  const qopOptions = value
    .split(",")
    .map((option) => option.trim().toLowerCase())
    .filter(Boolean)

  if (qopOptions.includes("auth")) {
    return "auth"
  }

  if (qopOptions.includes("auth-int")) {
    return "auth-int"
  }

  return value
}

function normalizeDigestAlgorithm(value: string) {
  const normalizedAlgorithm = value.trim().toLowerCase()

  if (normalizedAlgorithm === "md5-sess") {
    return "MD5-sess"
  }

  if (normalizedAlgorithm === "md5") {
    return "MD5"
  }

  return value
}
