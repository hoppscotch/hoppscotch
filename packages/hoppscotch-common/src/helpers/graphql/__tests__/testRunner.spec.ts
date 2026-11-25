import * as E from "fp-ts/Either"
import { afterEach, describe, expect, test, vi } from "vitest"

// ~/modules/i18n transitively imports the persistence service, which imports
// newstore/history, which subscribes to RequestRunner's executedResponses$ —
// a cycle that in test import order runs before RequestRunner finishes
// initializing. Stubbing i18n severs that edge; this spec never renders text.
vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
}))

import { runTestRunnerGQLRequest } from "~/helpers/graphql/testRunner"
import { getService } from "~/modules/dioc"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

// The executor captures the interceptor service singleton at module load —
// spying on the same singleton's `execute` intercepts the outgoing kernel
// request without touching the network. Returning a cancellation keeps each
// run one-shot: the request is captured, then the executor short-circuits.
const interceptor = getService(KernelInterceptorService)

const captureExecutedRequest = () => {
  const spy = vi.spyOn(interceptor, "execute").mockImplementation(
    () =>
      ({
        cancel: () => {},
        response: Promise.resolve(E.left("cancellation")),
      }) as any
  )
  return spy
}

afterEach(() => {
  vi.restoreAllMocks()
})

const envVar = (key: string, value: string) => ({
  key,
  initialValue: value,
  currentValue: value,
  secret: false,
})

const makeEnvState = (selected: ReturnType<typeof envVar>[] = []) => ({
  initialGlobalEnvs: [],
  initialEnvID: "env-id",
  initialSelectedEnvs: selected,
  initialEnvironmentIndex: { type: "NO_ENV_SELECTED" as const },
  initialEnvName: "No environment",
  initialEnvs: { global: [], selected, temp: [] },
  initialEnvsForComparison: { global: [], selected },
})

// Scriptless request — the pre/post script stages short-circuit, so the run
// exercises only env resolution, auth, and the wire-request build.
const gqlRequest = (url: string, query: string) => ({
  v: 10 as const,
  name: "executor-under-test",
  _ref_id: "gql-exec-1",
  url,
  query,
  variables: "{}",
  headers: [],
  auth: { authType: "none" as const, authActive: false },
  description: null,
  responses: {},
  preRequestScript: "",
  testScript: "",
})

describe("runTestRunnerGQLRequest — dataset iteration variables", () => {
  test("<<column>> resolves from iteration variables in URL and query", async () => {
    const spy = captureExecutedRequest()

    await runTestRunnerGQLRequest(
      gqlRequest(
        "https://<<host>>/graphql",
        "query { user(id: <<uid>>) { name } }"
      ) as any,
      true,
      [],
      makeEnvState() as any,
      [],
      [],
      [],
      [envVar("host", "rows.example.com"), envVar("uid", "42")]
    )

    expect(spy).toHaveBeenCalledTimes(1)
    const kernelRequest = spy.mock.calls[0][0] as any
    expect(kernelRequest.url).toBe("https://rows.example.com/graphql")
    expect(kernelRequest.content.content.query).toBe(
      "query { user(id: 42) { name } }"
    )
  })

  test("iteration values outrank collection variables of the same key", async () => {
    const spy = captureExecutedRequest()

    await runTestRunnerGQLRequest(
      gqlRequest(
        "https://api.example.com/graphql",
        "query { v(x: <<col>>) }"
      ) as any,
      true,
      [envVar("col", "from-collection")] as any,
      makeEnvState() as any,
      [],
      [],
      [],
      [envVar("col", "from-dataset-row")]
    )

    const kernelRequest = spy.mock.calls[0][0] as any
    expect(kernelRequest.content.content.query).toBe(
      "query { v(x: from-dataset-row) }"
    )
  })

  test("iteration values outrank selected-environment variables of the same key", async () => {
    const spy = captureExecutedRequest()

    await runTestRunnerGQLRequest(
      gqlRequest(
        "https://api.example.com/graphql",
        "query { v(x: <<col>>) }"
      ) as any,
      true,
      [],
      makeEnvState([envVar("col", "from-environment")]) as any,
      [],
      [],
      [],
      [envVar("col", "from-dataset-row")]
    )

    const kernelRequest = spy.mock.calls[0][0] as any
    expect(kernelRequest.content.content.query).toBe(
      "query { v(x: from-dataset-row) }"
    )
  })

  test("interceptor failures surface the invoked humanMessage heading, not the function", async () => {
    vi.spyOn(interceptor, "execute").mockImplementation(
      () =>
        ({
          cancel: () => {},
          response: Promise.resolve(
            E.left({
              humanMessage: { heading: () => "Interceptor exploded" },
              error: { message: "boom" },
            })
          ),
        }) as any
    )

    const result = await runTestRunnerGQLRequest(
      gqlRequest("https://api.example.com/graphql", "query { hello }") as any,
      true,
      [],
      makeEnvState() as any,
      [],
      [],
      []
    )

    expect(E.isLeft(result)).toBe(true)
    expect((result as any).left).toEqual({
      type: "request_fail",
      message: "Interceptor exploded",
    })
  })

  test("without iteration variables, environment resolution is unchanged", async () => {
    const spy = captureExecutedRequest()

    await runTestRunnerGQLRequest(
      gqlRequest("https://<<host>>/graphql", "query { hello }") as any,
      true,
      [],
      makeEnvState([envVar("host", "env.example.com")]) as any,
      [],
      [],
      []
    )

    const kernelRequest = spy.mock.calls[0][0] as any
    expect(kernelRequest.url).toBe("https://env.example.com/graphql")
  })
})
