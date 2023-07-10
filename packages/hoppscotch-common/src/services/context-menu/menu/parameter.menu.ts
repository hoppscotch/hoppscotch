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

//regex containing both url and parameter
const urlAndParameterRegex = new RegExp("[^&?]*?=[^&?]*")

interface Param {
  [key: string]: string
}

interface ExtractedParams {
  params: Param
  newURL?: string
}

function extractParams(input: string): ExtractedParams {
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
    const [_, key, value] = match
    params[key] = value
  }

  return { params, newURL }
}

function addParameter(text: string) {
  const { params, newURL } = extractParams(text)

  const queryParams = []
  for (const [key, value] of Object.entries(params)) {
    queryParams.push({ key, value, active: true })
  }

  console.log("param-check", queryParams)
  console.log("url", newURL)

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

export class ParameterMenuService extends Service implements ContextMenu {
  public static readonly ID = "PARAMETER_CONTEXT_MENU_SERVICE"

  public readonly menuID = "parameter"

  private readonly contextMenu = this.bind(ContextMenuService)

  constructor() {
    super()

    this.contextMenu.registerMenu(this)
  }

  createMenuType(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])

    if (urlAndParameterRegex.test(text)) {
      results.value = [
        {
          id: "environment",
          text: {
            type: "text",
            text: "Add to parameter",
          },
          icon: markRaw(IconArrowDownRight),
          action: () => {
            addParameter(text)
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
