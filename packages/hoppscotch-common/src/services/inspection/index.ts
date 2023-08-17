import { HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { Component, Ref, ref, watch } from "vue"
import { currentActiveTab, currentTabID } from "~/helpers/rest/tab"
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
   * Returns the inspector results for the request
   * @param req The request to inspect
   * @param res The response to inspect
   * @returns The inspector results
   */
  getInspectorFor: (
    req: HoppRESTRequest,
    res?: HoppRESTResponse
  ) => InspectorResult[]
}

/**
 * Defines the inspection service
 * The service watches the current active tab and returns the inspector results for the request and response
 */
export class InspectionService extends Service {
  public static readonly ID = "INSPECTION_SERVICE"

  private inspectors: Map<string, Inspector> = new Map()

  public tabs: Ref<Map<string, InspectorResult[]>> = ref(new Map())

  /**
   * Registers a inspector with the inspection service
   * @param inspector The inspector instance to register
   */
  public registerInspector(inspector: Inspector) {
    this.inspectors.set(inspector.inspectorID, inspector)
  }

  public initializeTabInspectors() {
    watch(
      currentActiveTab.value,
      (tab) => {
        if (!tab) return
        const req = currentActiveTab.value.document.request
        const res = currentActiveTab.value.response
        const inspectors = Array.from(this.inspectors.values()).map((x) =>
          x.getInspectorFor(req, res)
        )
        this.tabs.value.set(
          currentTabID.value,
          inspectors.flatMap((x) => x)
        )
      },
      { immediate: true, deep: true }
    )
  }

  public deleteTabInspectorResult(tabID: string) {
    this.tabs.value.delete(tabID)
  }
}
