import * as E from "fp-ts/Either"
import { Service } from "dioc"
import { MaybeRef, refWithControl } from "@vueuse/core"
import { AxiosRequestConfig, AxiosResponse } from "axios"
import type { getI18n } from "~/modules/i18n"
import { throwError } from "~/helpers/functional/error"
import { Component, Ref, computed, reactive, watch, unref, markRaw } from "vue"

export type NetworkResponse = AxiosResponse<unknown> & {
  config?: {
    timeData?: {
      startTime: number
      endTime: number
    }
  }
}

export type InterceptorError =
  | "cancellation"
  | {
      humanMessage: {
        heading: (t: ReturnType<typeof getI18n>) => string
        description: (t: ReturnType<typeof getI18n>) => string
      }
      error?: unknown
    }

export type RequestRunResult<Err extends InterceptorError = InterceptorError> =
  {
    cancel: () => void
    response: Promise<E.Either<Err, NetworkResponse>>
  }

export type InterceptorSelectableStatus<CustomComponentProps = any> =
  | { type: "selectable" }
  | {
      type: "unselectable"
      reason:
        | {
            type: "text"
            text: (t: ReturnType<typeof getI18n>) => string
            action?: {
              text: (t: ReturnType<typeof getI18n>) => string
              onActionClick: () => void
            }
          }
        | {
            type: "custom"
            component: Component<CustomComponentProps>
            props: CustomComponentProps
          }
    }

export type Interceptor<Err extends InterceptorError = InterceptorError> = {
  interceptorID: string
  name: (t: ReturnType<typeof getI18n>) => MaybeRef<string>
  settingsPageEntry?: {
    entryTitle: (t: ReturnType<typeof getI18n>) => string
    component: Component
  }
  selectorSubtitle?: Component
  selectable: MaybeRef<InterceptorSelectableStatus<unknown>>
  runRequest: (request: AxiosRequestConfig) => RequestRunResult<Err>
}

export class InterceptorService extends Service {
  public static readonly ID = "INTERCEPTOR_SERVICE"

  private interceptors: Map<string, Interceptor> = reactive(new Map())

  public currentInterceptorID: Ref<string | null> = refWithControl(
    null as string | null,
    {
      onBeforeChange: (value) => {
        if (!value) {
          // Only allow `null` if there are no interceptors
          return this.availableInterceptors.value.length === 0
        }

        if (value && !this.interceptors.has(value)) {
          console.warn(
            "Attempt to set current interceptor ID to unknown ID is ignored"
          )
          return false
        }

        return true
      },
    }
  )

  public availableInterceptors = computed(() =>
    Array.from(this.interceptors.values())
  )

  constructor() {
    super()

    watch([() => this.interceptors, this.currentInterceptorID], () => {
      if (!this.currentInterceptorID.value) return

      const interceptor = this.interceptors.get(this.currentInterceptorID.value)

      if (!interceptor) {
        this.currentInterceptorID.value = null
        return
      }

      if (unref(interceptor.selectable).type === "unselectable") {
        this.currentInterceptorID.value =
          this.availableInterceptors.value.filter(
            (interceptor) => unref(interceptor.selectable).type === "selectable"
          )[0]?.interceptorID ?? null
      }
    })
  }

  public registerInterceptor(interceptor: Interceptor) {
    // markRaw so that interceptor state by itself is not fully marked reactive
    this.interceptors.set(interceptor.interceptorID, markRaw(interceptor))

    if (this.currentInterceptorID.value === null) {
      this.currentInterceptorID.value = interceptor.interceptorID
    }
  }

  public runRequest(req: AxiosRequestConfig): RequestRunResult {
    if (!this.currentInterceptorID.value) {
      throw new Error("No interceptor selected")
    }

    const interceptor =
      this.interceptors.get(this.currentInterceptorID.value) ??
      throwError(
        "Current Interceptor ID is not found in the list of registered interceptors"
      )

    return interceptor.runRequest(req)
  }
}
