import { Observable } from "rxjs"
import { filter } from "rxjs/operators"
import { chain, right, TaskEither } from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { runTestScript, TestDescriptor } from "@hoppscotch/js-sandbox"
import { isRight } from "fp-ts/Either"
import {
  getCombinedEnvVariables,
  getFinalEnvsFromPreRequest,
} from "./preRequest"
import { getEffectiveRESTRequest } from "./utils/EffectiveURL"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { createRESTNetworkRequestStream } from "./network"
import { HoppTestData, HoppTestResult } from "./types/HoppTestResult"
import { isJSONContentType } from "./utils/contenttypes"
import { getRESTRequest, setRESTTestResults } from "~/newstore/RESTSession"

const getTestableBody = (res: HoppRESTResponse & { type: "success" }) => {
  const contentTypeHeader = res.headers.find(
    (h) => h.key.toLowerCase() === "content-type"
  )

  const rawBody = new TextDecoder("utf-8")
    .decode(res.body)
    .replaceAll("\x00", "")

  const x = pipe(
    // This pipeline just decides whether JSON parses or not
    contentTypeHeader && isJSONContentType(contentTypeHeader.value)
      ? O.of(rawBody)
      : O.none,

    // Try parsing, if failed, go to the fail option
    O.chain((body) => O.tryCatch(() => JSON.parse(body))),

    // If JSON, return that (get), else return just the body string (else)
    O.getOrElse<any | string>(() => rawBody)
  )

  return x
}

export const runRESTRequest$ = (): TaskEither<
  string | Error,
  Observable<HoppRESTResponse>
> =>
  pipe(
    getFinalEnvsFromPreRequest(
      getRESTRequest().preRequestScript,
      getCombinedEnvVariables()
    ),
    chain((envs) => {
      const effectiveRequest = getEffectiveRESTRequest(getRESTRequest(), {
        name: "Env",
        variables: envs,
      })

      const stream = createRESTNetworkRequestStream(effectiveRequest)

      // Run Test Script when request ran successfully
      const subscription = stream
        .pipe(filter((res) => res.type === "success"))
        .subscribe(async (res) => {
          if (res.type === "success") {
            const runResult = await runTestScript(res.req.testScript, {
              status: res.statusCode,
              body: getTestableBody(res),
              headers: res.headers,
            })()

            // TODO: Handle script executation fails (isLeft)
            if (isRight(runResult)) {
              setRESTTestResults(translateToSandboxTestResults(runResult.right))
            }

            subscription.unsubscribe()
          }
        })

      return right(stream)
    })
  )

function translateToSandboxTestResults(
  testDesc: TestDescriptor
): HoppTestResult {
  const translateChildTests = (child: TestDescriptor): HoppTestData => {
    return {
      description: child.descriptor,
      expectResults: child.expectResults,
      tests: child.children.map(translateChildTests),
    }
  }
  return {
    expectResults: testDesc.expectResults,
    tests: testDesc.children.map(translateChildTests),
  }
}
