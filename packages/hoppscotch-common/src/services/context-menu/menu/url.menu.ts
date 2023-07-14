import { Service } from "dioc"
import {
  ContextMenu,
  ContextMenuResult,
  ContextMenuService,
  ContextMenuState,
} from ".."
import { markRaw, ref } from "vue"
import IconCopyPlus from "~icons/lucide/copy-plus"
import { createNewTab } from "~/helpers/rest/tab"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { getI18n } from "~/modules/i18n"

function isValidURL(url: string) {
  try {
    new URL(url)
    return true
  } catch (error) {
    // Fallback to regular expression check
    const pattern = /^(https?:\/\/)?([\w.-]+)(\.[\w.-]+)+([/?].*)?$/
    return pattern.test(url)
  }
}

export class URLMenuService extends Service implements ContextMenu {
  public static readonly ID = "URL_CONTEXT_MENU_SERVICE"

  private t = getI18n()

  public readonly menuID = "url"

  private readonly contextMenu = this.bind(ContextMenuService)

  constructor() {
    super()

    this.contextMenu.registerMenu(this)
  }

  private openNewTab(url: string) {
    //create a new request object
    const request = {
      ...getDefaultRESTRequest(),
      endpoint: url,
    }

    createNewTab({
      request: request,
      isDirty: false,
    })
  }

  getMenuFor(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])

    if (isValidURL(text)) {
      results.value = [
        {
          id: "link-tab",
          text: {
            type: "text",
            text: this.t("context_menu.open_link_in_new_tab"),
          },
          icon: markRaw(IconCopyPlus),
          action: () => {
            this.openNewTab(text)
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
