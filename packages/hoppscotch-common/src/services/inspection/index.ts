import { HoppRESTRequest } from "@hoppscotch/data"
import { refDebounced } from "@vueuse/core"
import { Service } from "dioc"
import { computed } from "vue"
import { Component, Ref, ref, watch } from "vue"
import { currentActiveTab } from "~/helpers/rest/tab"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

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
  }
  doc: {
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
    req: Readonly<Ref<HoppRESTRequest>>,
    res: Readonly<Ref<HoppRESTResponse | null | undefined>>
  ) => Ref<InspectorResult[]>
}

/**
 * Defines the inspection service
 * The service watches the current active tab and returns the inspector results for the request and response
 */
export class InspectionService extends Service {
  public static readonly ID = "INSPECTION_SERVICE"

  private inspectors: Map<string, Inspector> = new Map()

  public tabs: Ref<Map<string, InspectorResult[]>> = ref(new Map())

  constructor() {
    super()

    this.initializeListeners()
  }

  /**
   * Registers a inspector with the inspection service
   * @param inspector The inspector instance to register
   */
  public registerInspector(inspector: Inspector) {
    this.inspectors.set(inspector.inspectorID, inspector)
  }

  private initializeListeners() {
    watch(
      () => [this.inspectors, currentActiveTab.value.id],
      () => {
        const debouncedReq = refDebounced(
          computed(() => currentActiveTab.value.document.request),
          1000,
          { maxWait: 2000 }
        )

        const debouncedRes = refDebounced(
          computed(() => currentActiveTab.value.response),
          1000,
          { maxWait: 2000 }
        )

        const inspectorRefs = Array.from(this.inspectors.values()).map((x) =>
          x.getInspections(debouncedReq, debouncedRes)
        )

        const activeInspections = computed(() =>
          inspectorRefs.flatMap((x) => x!.value)
        )

        watch(
          () => [...inspectorRefs.flatMap((x) => x!.value)],
          () => {
            this.tabs.value.set(
              currentActiveTab.value.id,
              activeInspections.value
            )
          },
          { immediate: true }
        )
      },
      { immediate: true, flush: "pre" }
    )
  }

  public deleteTabInspectorResult(tabID: string) {
    // TODO: Move Tabs into a service and implement this with an event instead
    this.tabs.value.delete(tabID)
  }
}
