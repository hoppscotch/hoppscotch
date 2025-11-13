import {
  HoppCollection,
  HoppCollectionVariable,
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { Ref } from "vue"
import {
  captureInitialEnvironmentState,
  runTestRunnerRequest,
} from "~/helpers/RequestRunner"
import {
  HoppTestRunnerDocument,
  TestRunnerConfig,
} from "~/helpers/rest/document"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "~/helpers/types/HoppTestResult"
import { HoppTab } from "../tab"
import { populateValuesInInheritedCollectionVars } from "~/helpers/utils/inheritedCollectionVarTransformer"
import {
  generateOAuth2TokenForCollection,
  hasOAuth2Auth,
  requiresRedirect,
  updateCollectionWithToken,
} from "~/helpers/oauth/auto-token-generator"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"

export type TestRunnerOptions = {
  stopRef: Ref<boolean>
} & TestRunnerConfig

export type TestRunnerRequest = HoppRESTRequest & {
  type: "test-response"
  response?: HoppRESTResponse | null
  testResults?: HoppTestResult | null
  isLoading?: boolean
  error?: string
  renderResults?: boolean
  passedTests: number
  failedTests: number
}

function delay(timeMS: number) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, timeMS)
    return () => {
      clearTimeout(timeout)
      reject(new Error("Operation cancelled"))
    }
  })
}

export class TestRunnerService extends Service {
  public static readonly ID = "TEST_RUNNER_SERVICE"

  public async runTests(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    t: ReturnType<typeof useI18n>,
    toast: ReturnType<typeof useToast>
  ) {
    // Reset the result collection
    tab.value.document.status = "running"
    tab.value.document.resultCollection = {
      v: collection.v,
      id: collection.id,
      name: collection.name,
      auth: collection.auth,
      headers: collection.headers,
      folders: [],
      requests: [],
      variables: [],
    }

    // Auto-generate OAuth 2.0 token if collection has OAuth configured
    if (hasOAuth2Auth(collection)) {
      const auth = collection.auth as Extract<
        HoppRESTAuth,
        { authType: "oauth-2" }
      >

      if (requiresRedirect(auth)) {
        // Grant types that require redirect cannot be auto-generated
        toast.error(
          t("authorization.oauth.redirect_not_supported_for_collection", {
            grantType: auth.grantTypeInfo.grantType,
          })
        )
        tab.value.document.status = "error"
        return
      }

      // Generate token automatically
      const tokenResult = await generateOAuth2TokenForCollection(collection)

      if (E.isLeft(tokenResult)) {
        const errorMessages: Record<string, string> = {
          NO_OAUTH_CONFIG: t("authorization.oauth.no_config_found"),
          REDIRECT_GRANT_TYPE_NOT_SUPPORTED: t(
            "authorization.oauth.redirect_not_supported_for_collection"
          ),
          VALIDATION_FAILED: t(
            "authorization.oauth.auto_generation_validation_failed"
          ),
          TOKEN_GENERATION_FAILED: t("authorization.oauth.token_fetch_failed"),
          UNSUPPORTED_GRANT_TYPE: t(
            "authorization.oauth.unsupported_grant_type_for_auto_generation"
          ),
        }

        toast.error(
          errorMessages[tokenResult.left] ||
            t("authorization.oauth.token_fetch_failed")
        )
        tab.value.document.status = "error"
        return
      }

      // Update collection with the generated token
      updateCollectionWithToken(
        collection,
        tokenResult.right.access_token,
        tokenResult.right.refresh_token
      )

      // Also update the result collection
      updateCollectionWithToken(
        tab.value.document.resultCollection!,
        tokenResult.right.access_token,
        tokenResult.right.refresh_token
      )

      toast.success(t("authorization.oauth.token_fetched_successfully"))
    }

    this.runTestCollection(tab, collection, options)
      .then(() => {
        tab.value.document.status = "stopped"
      })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.message === "Test execution stopped"
        ) {
          tab.value.document.status = "stopped"
        } else {
          tab.value.document.status = "error"
          console.error("Test runner failed:", error)
        }
      })
      .finally(() => {
        tab.value.document.status = "stopped"
      })
  }

  private async runTestCollection(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    collection: HoppCollection,
    options: TestRunnerOptions,
    parentPath: number[] = [],
    parentHeaders?: HoppRESTHeaders,
    parentAuth?: HoppRESTRequest["auth"],
    parentVariables: HoppCollection["variables"] = [],
    parentID?: string
  ) {
    try {
      // Compute inherited auth and headers for this collection
      const inheritedAuth =
        collection.auth?.authType === "inherit" && collection.auth.authActive
          ? parentAuth || { authType: "none", authActive: false }
          : collection.auth || { authType: "none", authActive: false }

      const inheritedHeaders: HoppRESTHeaders = [
        ...(parentHeaders || []),
        ...(collection.headers || []),
      ]

      const inheritedVariables = [
        ...(populateValuesInInheritedCollectionVars(
          parentVariables,
          parentID || collection._ref_id || collection.id
        ) || []),
        ...(populateValuesInInheritedCollectionVars(
          collection.variables || [],
          collection._ref_id || collection.id
        ) || []),
      ]

      // Process folders progressively
      for (let i = 0; i < collection.folders.length; i++) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }

        const folder = collection.folders[i]
        const currentPath = [...parentPath, i]

        // Add folder to the result collection
        this.addFolderToPath(
          tab.value.document.resultCollection!,
          currentPath,
          {
            ...cloneDeep(folder),
            folders: [],
            requests: [],
          }
        )

        // Pass inherited headers and auth to the folder
        await this.runTestCollection(
          tab,
          folder,
          options,
          currentPath,
          inheritedHeaders,
          inheritedAuth,
          inheritedVariables,
          collection._ref_id || collection.id
        )
      }

      // Process requests progressively
      for (let i = 0; i < collection.requests.length; i++) {
        if (options.stopRef?.value) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped")
        }

        const request = collection.requests[i] as TestRunnerRequest
        const currentPath = [...parentPath, i]

        // Add request to the result collection before execution
        this.addRequestToPath(
          tab.value.document.resultCollection!,
          currentPath,
          cloneDeep(request)
        )

        // Update the request with inherited headers and auth before execution
        const finalRequest = {
          ...request,
          auth:
            request.auth.authType === "inherit" && request.auth.authActive
              ? inheritedAuth
              : request.auth,
          headers: [...inheritedHeaders, ...request.headers],
        }

        await this.runTestRequest(
          tab,
          finalRequest,
          collection,
          options,
          currentPath,
          inheritedVariables
        )

        if (options.delay && options.delay > 0) {
          try {
            await delay(options.delay)
          } catch (error) {
            if (options.stopRef?.value) {
              tab.value.document.status = "stopped"
              throw new Error("Test execution stopped")
            }
          }
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Test execution stopped"
      ) {
        throw error
      }
      tab.value.document.status = "error"
      console.error("Collection execution failed:", error)
      throw error
    }
  }

  private addFolderToPath(
    collection: HoppCollection,
    path: number[],
    folder: HoppCollection
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Add the folder at the specified index
    if (path.length > 0) {
      current.folders[path[path.length - 1]] = folder
    }
  }

  private addRequestToPath(
    collection: HoppCollection,
    path: number[],
    request: TestRunnerRequest
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Add the request at the specified index
    if (path.length > 0) {
      current.requests[path[path.length - 1]] = request
    }
  }

  private updateRequestAtPath(
    collection: HoppCollection,
    path: number[],
    updates: Partial<TestRunnerRequest>
  ) {
    let current = collection

    // Navigate to the parent folder
    for (let i = 0; i < path.length - 1; i++) {
      current = current.folders[path[i]]
    }

    // Update the request at the specified index
    if (path.length > 0) {
      const index = path[path.length - 1]
      current.requests[index] = {
        ...current.requests[index],
        ...updates,
      } as TestRunnerRequest
    }
  }

  private async runTestRequest(
    tab: Ref<HoppTab<HoppTestRunnerDocument>>,
    request: TestRunnerRequest,
    collection: HoppCollection,
    options: TestRunnerOptions,
    path: number[],
    inheritedVariables: HoppCollectionVariable[] = []
  ) {
    if (options.stopRef?.value) {
      throw new Error("Test execution stopped")
    }

    try {
      // Update request status in the result collection
      this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
        isLoading: true,
        error: undefined,
      })

      // Capture the initial environment state for a test run so that it remains consistent and unchanged when current environment changes
      const initialEnvironmentState = captureInitialEnvironmentState()

      const results = await runTestRunnerRequest(
        request,
        options.keepVariableValues,
        inheritedVariables,
        initialEnvironmentState
      )

      if (options.stopRef?.value) {
        throw new Error("Test execution stopped")
      }

      if (results && E.isRight(results)) {
        const { response, testResult, updatedRequest } = results.right
        const { passed, failed } = this.getTestResultInfo(testResult)

        tab.value.document.testRunnerMeta.totalTests += passed + failed
        tab.value.document.testRunnerMeta.passedTests += passed
        tab.value.document.testRunnerMeta.failedTests += failed

        // Update request with results and propagate pre-request script changes in the result collection
        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          ...updatedRequest,
          testResults: testResult,
          response: options.persistResponses ? response : null,
          isLoading: false,
        })

        if (response.type === "success" || response.type === "fail") {
          tab.value.document.testRunnerMeta.totalTime +=
            response.meta.responseDuration
          tab.value.document.testRunnerMeta.completedRequests += 1
        }
      } else {
        const errorMsg = "Request execution failed"

        // Update request with error in the result collection
        this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
          error: errorMsg,
          isLoading: false,
          response: {
            type: "network_fail",
            error: "Unknown",
            req: request,
          },
        })

        if (options.stopOnError) {
          tab.value.document.status = "stopped"
          throw new Error("Test execution stopped due to error")
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Test execution stopped"
      ) {
        throw error
      }

      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred"

      // Update request with error in the result collection
      this.updateRequestAtPath(tab.value.document.resultCollection!, path, {
        error: errorMsg,
        isLoading: false,
      })

      if (options.stopOnError) {
        tab.value.document.status = "stopped"
        throw new Error("Test execution stopped due to error")
      }
    }
  }

  private getTestResultInfo(testResult: HoppTestData) {
    let passed = 0
    let failed = 0

    for (const result of testResult.expectResults) {
      if (result.status === "pass") {
        passed++
      } else if (result.status === "fail") {
        failed++
      }
    }

    for (const nestedTest of testResult.tests) {
      const nestedResult = this.getTestResultInfo(nestedTest)
      passed += nestedResult.passed
      failed += nestedResult.failed
    }

    return { passed, failed }
  }
}
