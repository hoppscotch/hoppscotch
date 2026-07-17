import {
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"
import { refDebounced } from "@vueuse/core"
import { Service } from "dioc"
import {
  Component,
  Ref,
  ref,
  watch,
  computed,
  markRaw,
  reactive,
  effectScope,
  EffectScope,
} from "vue"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { RESTTabService } from "../tab/rest"
/**
 * Defines how to render the text in an Inspector Result
 */
export type InspectorTextType<T extends object | Component = never> =
  | {
      type: "text"
      text: string[] | string
    }
  | {
      type: "custom"
      component: T
      componentProps: T extends Component<infer Props> ? Props : never
    }

export type InspectorLocation =
  | {
      type: "url"
    }
  | {
      type: "header"
      position: "key" | "value"
      key?: string
      index?: number
    }
  | {
      type: "parameter"
      position: "key" | "value"
      key?: string
      index?: number
    }
  | {
      type: "body"
      key: string
      index: number
    }
  | {
      type: "response"
    }
  | {
      type: "body-content-type-header"
    }

/**
 * Defines info about an inspector result so the UI can render it
 */
export interface InspectorResult {
  id: string
  text: InspectorTextType<any>
  icon: object | Component
  severity: number
  isApplicable: boolean
  action?: {
    text: string
    apply: () => void
    showAction?: boolean
  }
  doc?: {
    text: string
    link: string
  }
  locations: InspectorLocation
}

/**
 * Defines the state of the inspector service
 */
export type InspectorState = {
  results: InspectorResult[]
}

/**
 * Defines an inspector that can be registered with the inspector service
 * Inspectors are used to perform checks on a request and return the results
 */
export interface Inspector {
  /**
   * The unique ID of the inspector
   */
  inspectorID: string
  /**
   * Returns the inspector results for the request.
   * NOTE: The refs passed down are readonly and are debounced to avoid performance issues
   * @param req The ref to the request to inspect
   * @param res The ref to the response to inspect
   * @returns The ref to the inspector results
   */
  getInspections: (
    req: Readonly<Ref<HoppRESTRequest | HoppRESTResponseOriginalRequest>>,
    res: Readonly<Ref<HoppRESTResponse | null | undefined>>
  ) => Ref<InspectorResult[]>
}

/**
 * Defines the inspection service
 * The service watches the current active tab and returns the inspector results for the request and response
 */
export class InspectionService extends Service {
  public static readonly ID = "INSPECTION_SERVICE"

  private inspectors: Map<string, Inspector> = reactive(new Map())

  private tabs: Ref<Map<string, InspectorResult[]>> = ref(new Map())

  private readonly restTab = this.bind(RESTTabService)

  private watcherStopHandle: (() => void) | null = null
  private effectScope: EffectScope | null = null

  override onServiceInit() {
    this.initializeListeners()

    // Watch for tab changes and inspector registration to reinitialize
    // and create new debounced refs
    watch(
      () => [
        this.inspectors.entries(),
        this.restTab.currentActiveTab.value?.id,
      ],
      () => {
        this.initializeListeners()
      },
      { flush: "pre" }
    )
  }

  /**
   * Registers a inspector with the inspection service
   * @param inspector The inspector instance to register
   */
  public registerInspector(inspector: Inspector) {
    // markRaw is required here so that the inspector is not made reactive
    this.inspectors.set(inspector.inspectorID, markRaw(inspector))
  }

  private initializeListeners() {
    // Dispose previous reactive effects
    this.watcherStopHandle?.()
    this.effectScope?.stop()

    // Create new effect scope for all computed refs and watchers
    this.effectScope = effectScope()

    this.effectScope.run(() => {
      const currentTabRequest = computed(() => {
        const activeTab = this.restTab.currentActiveTab.value
        if (!activeTab || activeTab.document.type === "test-runner") return null

        return activeTab.document.type === "request"
          ? activeTab.document.request
          : activeTab.document.response.originalRequest
      })

      const currentTabResponse = computed(() => {
        const activeTab = this.restTab.currentActiveTab.value
        if (activeTab?.document.type === "request") {
          return activeTab.document.response
        }
        return null
      })

      const debouncedReq = refDebounced(currentTabRequest, 1000, {
        maxWait: 2000,
      })
      const debouncedRes = refDebounced(currentTabResponse, 1000, {
        maxWait: 2000,
      })

      const inspectorRefs = computed(() => {
        if (debouncedReq.value === null) return []

        return Array.from(this.inspectors.values()).map((inspector) =>
          inspector.getInspections(
            debouncedReq as Readonly<
              Ref<HoppRESTRequest | HoppRESTResponseOriginalRequest>
            >,
            debouncedRes
          )
        )
      })

      const activeInspections = computed(() =>
        inspectorRefs.value.flatMap((x) => x?.value ?? [])
      )

      this.watcherStopHandle = watch(
        () => [...activeInspections.value],
        () => {
          const activeTab = this.restTab.currentActiveTab.value
          if (!activeTab) return

          this.tabs.value.set(activeTab.id, activeInspections.value)
        },
        { immediate: true, flush: "pre" }
      )
    })
  }

  public deleteTabInspectorResult(tabID: string) {
    // TODO: Move Tabs into a service and implement this with an event instead
    this.tabs.value.delete(tabID)
  }

  /**
   * Returns a reactive view into the inspector results for a specific tab
   * @param tabID The ID of the tab to get the results for
   * @param filter The filter to apply to the results.
   * @returns The ref into the inspector results, if the tab doesn't exist, a ref into an empty array is returned
   */
  public getResultViewFor(
    tabID: string | null,
    filter: (x: InspectorResult) => boolean = () => true
  ) {
    if (!tabID) return computed<InspectorResult[]>(() => [])

    return computed(() => this.tabs.value.get(tabID)?.filter(filter) ?? [])
  }
}
