import type {
  Environment,
  HoppGQLAuth,
  HoppGQLRequest,
  HoppRESTAuth,
} from "@hoppscotch/data"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@hoppscotch/data", async () => {
  const actual =
    await vi.importActual<typeof import("@hoppscotch/data")>("@hoppscotch/data")
  return {
    ...actual,
    generateJWTToken: vi.fn(),
  }
})

const { generateJWTToken } = await import("@hoppscotch/data")
const { getDefaultGQLRequest } = await import("~/helpers/graphql/default")
const { getComputedGQLAuthHeaders } = await import("../EffectiveURL")

const envVars: Environment["variables"] = [
  {
    key: "TOKEN",
    secret: false,
    initialValue: "env-token",
    currentValue: "env-token",
  },
]

const makeRequest = (
  auth: HoppGQLAuth,
  headers: HoppGQLRequest["headers"] = []
) =>
  ({
    ...getDefaultGQLRequest(),
    url: "https://api.example.com/graphql",
    auth,
    headers,
  }) as HoppGQLRequest

describe("getComputedGQLAuthHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("returns nothing when auth is inactive", async () => {
    const headers = await getComputedGQLAuthHeaders(
      envVars,
      makeRequest({ authType: "bearer", authActive: false, token: "abc" })
    )

    expect(headers).toEqual([])
  })

  test("an explicit Authorization header supersedes generated auth", async () => {
    const headers = await getComputedGQLAuthHeaders(
      envVars,
      makeRequest({ authType: "bearer", authActive: true, token: "abc" }, [
        {
          key: "authorization",
          value: "Bearer manual",
          active: true,
          description: "",
        },
      ])
    )

    expect(headers).toEqual([])
  })

  test("resolves environment variables in the generated header", async () => {
    const headers = await getComputedGQLAuthHeaders(
      envVars,
      makeRequest({
        authType: "bearer",
        authActive: true,
        token: "<<TOKEN>>",
      })
    )

    expect(headers).toEqual([
      {
        active: true,
        key: "Authorization",
        value: "Bearer env-token",
        description: "",
      },
    ])
  })

  // JWT/HAWK/digest are REST-only auth types a GQL request can still pick up
  // through collection inheritance
  test("supports inherited JWT auth", async () => {
    vi.mocked(generateJWTToken).mockResolvedValue("jwt-token")

    const inheritedAuth: HoppRESTAuth = {
      authType: "jwt",
      authActive: true,
      secret: "my-secret",
      privateKey: "",
      algorithm: "HS256",
      payload: "{}",
      addTo: "HEADERS",
      isSecretBase64Encoded: false,
      headerPrefix: "Bearer ",
      paramName: "token",
      jwtHeaders: "{}",
    }

    const headers = await getComputedGQLAuthHeaders(
      envVars,
      makeRequest({ authType: "inherit", authActive: true }),
      inheritedAuth
    )

    expect(headers).toEqual([
      {
        active: true,
        key: "Authorization",
        value: "Bearer jwt-token",
        description: "",
      },
    ])
  })
})
