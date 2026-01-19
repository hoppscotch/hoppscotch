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
 * Used to check if a string is a valid URL
 * @param url The string to check
 * @returns Whether the string is a valid URL
 */
function isValidURL(url: string) {
  try {
    // Try to create a URL object
    // this will fail for endpoints like "localhost:3000", ie without a protocol
    new URL(url)
    return true
  } catch (_error) {
    // Fallback to regular expression check
    const pattern = /^(https?:\/\/)?([\w.-]+)(\.[\w.-]+)+([/?].*)?/
    if (pattern.test(url)) return true

    // If the string is percent-encoded (eg: contains "%"), try decoding
    // and validate the decoded value as a URL as well. decodeURIComponent
    // can throw for malformed input, so guard it.
    try {
      const decoded = decodeURIComponent(url)
      // Try URL constructor on decoded value
      try {
        new URL(decoded)
        return true
      } catch {
        return pattern.test(decoded)
      }
    } catch {
      return false
    }
  }
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
    const newEndpoint = endpoint.replace(selectedText, replacement)
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
              // If decoding fails, do nothing
              // The text might not be encoded
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
