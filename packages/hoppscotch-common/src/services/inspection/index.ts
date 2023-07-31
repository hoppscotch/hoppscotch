import { HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { Component, Ref, watch } from "vue"
import { currentTabID } from "~/helpers/rest/tab"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

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

export type InspectorChecks = Array<Check>

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

export type InspectorState = {
  results: InspectorResult[]
}

export interface Inspector {
  inspectorID: string
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

  private tabs: Map<string, InspectorResult[]> = new Map()

  public registerInspector(inspector: Inspector) {
    this.inspectors.set(inspector.inspectorID, inspector)
  }

  private setTabState(tabID: string, state: InspectorResult[]) {
    this.tabs.set(tabID, state)
  }

  public getTabState(tabID: string) {
    return this.tabs.get(tabID)
  }

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

    const results = result.filter(
      (x) => x.componentRefID === componentRefID.value
    )

    this.setTabState(currentTabID.value, result)

    return results
  }

  getCurrentTabState() {
    return this.getTabState(currentTabID.value)
  }

  watchTabState() {
    const tabID = currentTabID.value
    watch(
      () => this.getTabState(tabID),
      (res) => {
        if (!res) {
          return
        }

        return res
      }
    )
  }
}
