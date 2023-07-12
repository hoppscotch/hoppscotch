import { Service } from "dioc"
import {
  ContextMenu,
  ContextMenuResult,
  ContextMenuService,
  ContextMenuState,
} from "../"
import { markRaw, ref } from "vue"
import IconArrowDownRight from "~icons/lucide/arrow-down-right"
import { currentActiveTab } from "~/helpers/rest/tab"
import { getI18n } from "~/modules/i18n"

//regex containing both url and parameter
const urlAndParameterRegex = new RegExp("[^&?]*?=[^&?]*")

interface Param {
  [key: string]: string
}

interface ExtractedParams {
  params: Param
  newURL?: string
}

export class ParameterMenuService extends Service implements ContextMenu {
  public static readonly ID = "PARAMETER_CONTEXT_MENU_SERVICE"

  private t = getI18n()

  public readonly menuID = "parameter"

  private readonly contextMenu = this.bind(ContextMenuService)

  constructor() {
    super()

    this.contextMenu.registerMenu(this)
  }

  private extractParams(input: string): ExtractedParams {
    let text = input
    let newURL: string | undefined

    if (text.startsWith("http")) {
      const url = new URL(text)
      newURL = url.origin + url.pathname
      text = url.search.slice(1)
    }

    const regex = /(\w+)=(\w+)/g
    const matches = text.matchAll(regex)
    const params: Param = {}

    for (const match of matches) {
      const [, key, value] = match
      params[key] = value
    }

    return { params, newURL }
  }

  private addParameter(text: string) {
    const { params, newURL } = this.extractParams(text)

    const queryParams = []
    for (const [key, value] of Object.entries(params)) {
      queryParams.push({ key, value, active: true })
    }

    currentActiveTab.value.document.request.params = [
      ...currentActiveTab.value.document.request.params,
      ...queryParams,
    ]

    if (newURL) {
      currentActiveTab.value.document.request.endpoint = newURL
    } else {
      const textRegex = new RegExp(`\\b${text.replace(/\?/g, "")}\\b`, "gi")
      const sanitizedWord = currentActiveTab.value.document.request.endpoint
      const newURL = sanitizedWord.replace(textRegex, "")
      currentActiveTab.value.document.request.endpoint = newURL
    }
  }

  getMenuFor(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])

    if (urlAndParameterRegex.test(text)) {
      results.value = [
        {
          id: "environment",
          text: {
            type: "text",
            text: this.t("context_menu.add_parameter"),
          },
          icon: markRaw(IconArrowDownRight),
          action: () => {
            this.addParameter(text)
          },
        },
      ]
    }

    const resultObj = <ContextMenuState>{
      results: results.value,
    }

    return resultObj
  }
}
