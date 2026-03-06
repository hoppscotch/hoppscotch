import { Service } from "dioc"
import { markRaw, ref } from "vue"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { getI18n } from "~/modules/i18n"
import { RESTTabService } from "~/services/tab/rest"
import IconCopyPlus from "~icons/lucide/copy-plus"
import IconLock from "~icons/lucide/lock"
import IconUnlock from "~icons/lucide/unlock"
import {
  ContextMenu,
  ContextMenuResult,
  ContextMenuService,
  ContextMenuState,
} from ".."

/**
 * Checks if a string matches a URL via the URL constructor or a regex fallback.
 * The URL constructor rejects endpoints like "localhost:3000" (no protocol),
 * so the regex covers common patterns without a scheme.
 */
function checkURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return /^(https?:\/\/)?([\w.-]+)(\.[\w.-]+)+([/?].*)?$/.test(url)
  }
}

/**
 * Used to check if a string is a valid URL
 * @param url The string to check
 * @returns Whether the string is a valid URL
 */
function isValidURL(url: string) {
  if (checkURL(url)) return true

  // Iteratively decode percent-encoded strings so that encode/decode
  // round-trips work across multiple levels of encoding.
  let current = url
  for (let i = 0; i < 10 && current.includes("%"); i++) {
    try {
      const decoded = decodeURIComponent(current)
      if (decoded === current) break
      if (checkURL(decoded)) return true
      current = decoded
    } catch {
      break
    }
  }

  return false
}

export class URLMenuService extends Service implements ContextMenu {
  public static readonly ID = "URL_CONTEXT_MENU_SERVICE"

  private t = getI18n()

  public readonly menuID = "url"

  private readonly contextMenu = this.bind(ContextMenuService)
  private readonly restTab = this.bind(RESTTabService)

  override onServiceInit() {
    this.contextMenu.registerMenu(this)
  }

  /**
   * Opens a new tab with the provided URL
   * @param url The URL to open
   */
  private openNewTab(url: string) {
    //create a new request object
    const request = {
      ...getDefaultRESTRequest(),
      endpoint: url,
    }

    this.restTab.createNewTab({
      type: "request",
      request: request,
      isDirty: false,
    })
  }

  /**
   * Replaces the selected text in the current endpoint with encoded/decoded version
   * @param selectedText The selected text to replace
   * @param replacement The replacement text (encoded or decoded)
   */
  private replaceSelectedText(selectedText: string, replacement: string) {
    const currentTab = this.restTab.currentActiveTab.value

    if (!currentTab || currentTab.document.type !== "request") {
      return
    }

    const endpoint = currentTab.document.request.endpoint

    // Find and replace the selected text in the endpoint
    const index = endpoint.indexOf(selectedText)
    if (index === -1) return

    const newEndpoint =
      endpoint.slice(0, index) +
      replacement +
      endpoint.slice(index + selectedText.length)
    currentTab.document.request.endpoint = newEndpoint
  }

  getMenuFor(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])

    if (isValidURL(text)) {
      results.value = [
        {
          id: "link-tab",
          text: {
            type: "text",
            text: this.t("context_menu.open_request_in_new_tab"),
          },
          icon: markRaw(IconCopyPlus),
          action: () => {
            this.openNewTab(text)
          },
        },
        {
          id: "encode-url",
          text: {
            type: "text",
            text: this.t("context_menu.encode_uri_component"),
          },
          icon: markRaw(IconLock),
          action: () => {
            const encoded = encodeURIComponent(text)
            this.replaceSelectedText(text, encoded)
          },
        },
        {
          id: "decode-url",
          text: {
            type: "text",
            text: this.t("context_menu.decode_uri_component"),
          },
          icon: markRaw(IconUnlock),
          action: () => {
            try {
              const decoded = decodeURIComponent(text)
              this.replaceSelectedText(text, decoded)
            } catch (error) {
              console.warn(
                "[URLMenuService] Failed to decode URI component:",
                error
              )
            }
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
