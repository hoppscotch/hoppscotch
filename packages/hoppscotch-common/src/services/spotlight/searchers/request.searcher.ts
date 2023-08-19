import { Component, markRaw, reactive } from "vue"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconShare from "~icons/lucide/share"
import { currentActiveTab } from "~/helpers/rest/tab"
import { RequestOptionTabs } from "~/components/http/RequestOptions.vue"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
}

/**
 *
 * This searcher is responsible for providing request related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class RequestSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "REQUEST_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "request"
  public searcherSectionTitle = this.t("shortcut.request.title")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
    send_request: {
      text: this.t("shortcut.request.send_request"),
      alternates: ["request", "send"],
      icon: markRaw(IconShare),
    },
    save_to_collections: {
      text: this.t("shortcut.request.save_to_collections"),
      alternates: ["save", "collections"],
      icon: markRaw(IconShare),
    },
    save_request: {
      text: this.t("shortcut.request.save_request"),
      alternates: ["save", "request"],
      icon: markRaw(IconShare),
    },
    rename_request: {
      text: this.t("shortcut.request.rename"),
      alternates: ["rename", "request"],
      icon: markRaw(IconShare),
    },
    copy_request_link: {
      text: this.t("shortcut.request.copy_request_link"),
      alternates: ["copy", "link"],
      icon: markRaw(IconShare),
    },
    reset_request: {
      text: this.t("shortcut.request.reset_request"),
      alternates: ["reset", "request"],
      icon: markRaw(IconShare),
    },
    import_curl: {
      text: this.t("shortcut.request.import_curl"),
      alternates: ["import", "curl"],
      icon: markRaw(IconShare),
    },
    show_code: {
      text: this.t("shortcut.request.show_code"),
      alternates: ["show", "code"],
      icon: markRaw(IconShare),
    },
    // Change request method
    next_method: {
      text: this.t("shortcut.request.next_method"),
      alternates: ["next", "method"],
      icon: markRaw(IconShare),
    },
    previous_method: {
      text: this.t("shortcut.request.previous_method"),
      alternates: ["previous", "method"],
      icon: markRaw(IconShare),
    },
    get_method: {
      text: this.t("shortcut.request.get_method"),
      alternates: ["get", "method"],
      icon: markRaw(IconShare),
    },
    head_method: {
      text: this.t("shortcut.request.head_method"),
      alternates: ["head", "method"],
      icon: markRaw(IconShare),
    },
    post_method: {
      text: this.t("shortcut.request.post_method"),
      alternates: ["post", "method"],
      icon: markRaw(IconShare),
    },
    put_method: {
      text: this.t("shortcut.request.put_method"),
      alternates: ["put", "method"],
      icon: markRaw(IconShare),
    },
    delete_method: {
      text: this.t("shortcut.request.delete_method"),
      alternates: ["delete", "method"],
      icon: markRaw(IconShare),
    },
    // Change sub tabs
    tab_parameters: {
      text: this.t("spotlight.request.tab_parameters"),
      alternates: ["parameters", "tab"],
      icon: markRaw(IconShare),
    },
    tab_body: {
      text: this.t("spotlight.request.tab_body"),
      alternates: ["body", "tab"],
      icon: markRaw(IconShare),
    },
    tab_headers: {
      text: this.t("spotlight.request.tab_headers"),
      alternates: ["headers", "tab"],
      icon: markRaw(IconShare),
    },
    tab_authorization: {
      text: this.t("spotlight.request.tab_authorization"),
      alternates: ["authorization", "tab"],
      icon: markRaw(IconShare),
    },
    tab_pre_request_script: {
      text: this.t("spotlight.request.tab_pre_request_script"),
      alternates: ["pre-request", "script", "tab"],
      icon: markRaw(IconShare),
    },
    tab_tests: {
      text: this.t("spotlight.request.tab_tests"),
      alternates: ["tests", "tab"],
      icon: markRaw(IconShare),
    },
  })

  constructor() {
    super({
      searchFields: ["text", "alternates"],
      fieldWeights: {
        text: 2,
        alternates: 1,
      },
    })

    this.setDocuments(this.documents)
    this.spotlight.registerSearcher(this)
  }

  protected getSearcherResultForSearchResult(
    result: SearchResult<Doc>
  ): SpotlightSearcherResult {
    return {
      id: result.id,
      icon: result.doc.icon,
      text: { type: "text", text: result.doc.text },
      score: result.score,
    }
  }

  private openRequestTab(tab: RequestOptionTabs): void {
    invokeAction("request.open-tab", {
      tab,
    })
  }

  public onDocSelected(id: string): void {
    switch (id) {
      case "send_request":
        invokeAction("request.send-cancel")
        break
      case "save_to_collections":
        invokeAction("request.save-as", {
          requestType: "rest",
          request: currentActiveTab.value?.document.request,
        })
        break
      case "save_request":
        invokeAction("request.save")
        break
      case "rename_request":
        invokeAction("rest.request.rename")
        break
      case "copy_request_link":
        invokeAction("request.copy-link")
        break
      case "reset_request":
        invokeAction("request.reset")
        break
      case "next_method":
        invokeAction("request.method.next")
        break
      case "previous_method":
        invokeAction("request.method.prev")
        break
      case "get_method":
        invokeAction("request.method.get")
        break
      case "head_method":
        invokeAction("request.method.head")
        break
      case "post_method":
        invokeAction("request.method.post")
        break
      case "put_method":
        invokeAction("request.method.put")
        break
      case "delete_method":
        invokeAction("request.method.delete")
        break
      case "import_curl":
        invokeAction("request.import-curl")
        break
      case "show_code":
        invokeAction("request.show-code")
        break
      case "tab_parameters":
        this.openRequestTab("params")
        break
      case "tab_body":
        this.openRequestTab("bodyParams")
        break
      case "tab_headers":
        this.openRequestTab("headers")
        break
      case "tab_authorization":
        this.openRequestTab("authorization")
        break
      case "tab_pre_request_script":
        this.openRequestTab("preRequestScript")
        break
      case "tab_tests":
        this.openRequestTab("tests")
        break
    }
  }
}
