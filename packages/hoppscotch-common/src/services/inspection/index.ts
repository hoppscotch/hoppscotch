import { HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { Component, Ref, ref } from "vue"
import { currentTabID } from "~/helpers/rest/tab"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

/**
 * Checks that can be performed by the inspector service
 * These checks are used to determine which checks should be performed by the inspector service
 */
export type Check =
  | "url_environment_validation"
  | "header_key_environment_validation"
  | "header_value_environment_validation"
  | "parameter_key_environment_validation"
  | "parameter_value_environment_validation"
  | "body_value_environment_validation"
  | "url_validation"
  | "header_validation"
  | "pre_request_script"
  | "response_errors"
  | "all_validation"

/**
 * Checks that can be performed by the inspector service as an array provided by the specific component
 */
export type InspectorChecks = Array<Check>

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

/**
 * Defines info about an inspector result so the UI can render it
 */
export interface InspectorResult {
  id: string
  componentRefID: string
  text: InspectorTextType<any>
  icon: object | Component
  severity: number
  isApplicable: boolean
  action?: {
    text: string
    apply: () => void
  }
  index?: number
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
   * @param checks The checks to perform
   * @param componentRefID The component reference ID
   * @param res The response to inspect
   * @returns The inspector results
   */
  getInspectorFor: (
    req: HoppRESTRequest,
    checks: InspectorChecks,
    componentRefID: Ref<string>,
    res?: HoppRESTResponse
  ) => InspectorResult[]
}

export class InspectionService extends Service {
  public static readonly ID = "INSPECTION_SERVICE"

  private inspectors: Map<string, Inspector> = new Map()

  /**
   * The tabs map that stores the inspector results for each tab
   */
  public tabs: Ref<Map<string, InspectorResult[]>> = ref(new Map())

  /**
   * The current tab inspector value
   * This is used to watch the current tab inspector value
   */
  public currentTabInspectorValue = ref<InspectorResult[]>([])

  /**
   * Registers an inspector with the inspection service
   * @param inspector The inspector to register
   */
  public registerInspector(inspector: Inspector) {
    this.inspectors.set(inspector.inspectorID, inspector)
  }

  private setTabInspectorState(tabID: string, state: InspectorResult[]) {
    this.tabs.value.set(tabID, state)
  }

  public getTabInspectorState(tabID: string) {
    return this.tabs.value.get(tabID)
  }

  /**
   * Returns the inspector results for the request
   * @param req The request to inspect
   * @param checks The checks to perform
   * @param componentRefID The component reference ID
   * @param res The response to inspect
   * @returns The inspector results
   */
  public getInspectorFor(
    req: HoppRESTRequest,
    checks: InspectorChecks,
    componentRefID: Ref<string>,
    res?: HoppRESTResponse
  ): InspectorResult[] {
    if (!currentTabID.value) {
      return []
    }

    const inspectors = Array.from(this.inspectors.values()).map((x) =>
      x.getInspectorFor(req, checks, componentRefID, res)
    )

    const result = inspectors.flatMap((x) => {
      return x
    })

    // const results = result.filter(
    //   (x) => x.componentRefID === componentRefID.value
    // )

    this.setTabInspectorState(currentTabID.value, result)
    // Set the current tab value from the tabs map
    this.currentTabInspectorValue.value =
      this.tabs.value.get(currentTabID.value) || []
    // console.log(
    //   "---------------INSPECTOR RESULTS TABS-----------",
    //   this.tabs.value
    // )

    return result
  }

  public getCurrentTabInspectorState() {
    return this.getTabInspectorState(currentTabID.value)
  }

  public clearTabState(tabID: string) {
    this.tabs.value.delete(tabID)
  }
}
