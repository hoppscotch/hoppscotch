import { Service } from "dioc"
import {
  ContextMenu,
  ContextMenuResult,
  ContextMenuService,
  ContextMenuState,
} from ".."
import { markRaw, ref } from "vue"
import IconTabOpen from "~icons/lucide/file-symlink"
import IconBrowserOpen from "~icons/lucide/external-link"
import { createNewTab, currentTabID } from "~/helpers/rest/tab"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { getI18n } from "~/modules/i18n"

//regex containing both url
const url = new RegExp(
  /^(?:(?:https?|ftp):\/\/)?(?:www\.)?(?:[A-Za-z0-9_-]+\.)*[A-Za-z0-9_-]+(?::\d+)?$/
)

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

    const tab = createNewTab({
      request: request,
      isDirty: false,
    })

    currentTabID.value = tab.id
  }

  private openInBrowser(url: string) {
    window.open(url, "_blank", "noopener noreferrer")
  }

  getMenuFor(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])

    if (url.test(text)) {
      results.value = [
        {
          id: "link-tab",
          text: {
            type: "text",
            text: this.t("context_menu.open_link_in_new_tab"),
          },
          icon: markRaw(IconTabOpen),
          action: () => {
            this.openNewTab(text)
          },
        },
        {
          id: "link-browser",
          text: {
            type: "text",
            text: this.t("context_menu.open_link_in_browser"),
          },
          icon: markRaw(IconBrowserOpen),
          action: () => {
            this.openInBrowser(text)
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
