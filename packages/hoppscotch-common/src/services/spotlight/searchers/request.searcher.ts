import { Component, computed, markRaw, reactive } from "vue"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import { useRoute } from "vue-router"
import { RequestOptionTabs } from "~/components/http/RequestOptions.vue"
import { currentActiveTab } from "~/helpers/rest/tab"
import IconWindow from "~icons/lucide/app-window"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCode2 from "~icons/lucide/code-2"
import IconCopy from "~icons/lucide/copy"
import IconFileCode from "~icons/lucide/file-code"
import IconRename from "~icons/lucide/file-edit"
import IconPlay from "~icons/lucide/play"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconSave from "~icons/lucide/save"

type Doc = {
  text: string | string[]
  alternates: string[]
  icon: object | Component
  excludeFromSearch?: boolean
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

  private route = useRoute()
  private isRESTPage = computed(() => this.route.name === "index")
  private isGQLPage = computed(() => this.route.name === "graphql")

  private documents: Record<string, Doc> = reactive({
    send_request: {
      text: this.t("shortcut.request.send_request"),
      alternates: ["request", "send"],
      icon: markRaw(IconPlay),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    save_to_collections: {
      text: this.t("spotlight.request.save_as_new"),
      alternates: ["save", "collections"],
      icon: markRaw(IconSave),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    save_request: {
      text: this.t("shortcut.request.save_request"),
      alternates: ["save", "request"],
      icon: markRaw(IconSave),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    rename_request: {
      text: this.t("shortcut.request.rename"),
      alternates: ["rename", "request"],
      icon: markRaw(IconRename),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    copy_request_link: {
      text: this.t("shortcut.request.copy_request_link"),
      alternates: ["copy", "link"],
      icon: markRaw(IconCopy),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    reset_request: {
      text: this.t("shortcut.request.reset_request"),
      alternates: ["reset", "request"],
      icon: markRaw(IconRotateCCW),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    import_curl: {
      text: this.t("shortcut.request.import_curl"),
      alternates: ["import", "curl"],
      icon: markRaw(IconFileCode),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    show_code: {
      text: this.t("shortcut.request.show_code"),
      alternates: ["show", "code"],
      icon: markRaw(IconCode2),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    // Change request method
    get_method: {
      text: [this.t("spotlight.request.select_method"), "GET"],
      alternates: ["get", "method"],
      icon: markRaw(IconCheckCircle),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    head_method: {
      text: [this.t("spotlight.request.select_method"), "HEAD"],
      alternates: ["head", "method"],
      icon: markRaw(IconCheckCircle),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    post_method: {
      text: [this.t("spotlight.request.select_method"), "POST"],
      alternates: ["post", "method"],
      icon: markRaw(IconCheckCircle),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    put_method: {
      text: [this.t("spotlight.request.select_method"), "PUT"],
      alternates: ["put", "method"],
      icon: markRaw(IconCheckCircle),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    delete_method: {
      text: [this.t("spotlight.request.select_method"), "DELETE"],
      alternates: ["delete", "method"],
      icon: markRaw(IconCheckCircle),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    // Change sub tabs
    tab_parameters: {
      text: [
        this.t("spotlight.request.switch_to"),
        this.t("spotlight.request.tab_parameters"),
      ],
      alternates: ["parameters", "tab"],
      icon: markRaw(IconWindow),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    tab_body: {
      text: [
        this.t("spotlight.request.switch_to"),
        this.t("spotlight.request.tab_body"),
      ],
      alternates: ["body", "tab"],
      icon: markRaw(IconWindow),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    tab_headers: {
      text: [
        this.t("spotlight.request.switch_to"),
        this.t("spotlight.request.tab_headers"),
      ],
      alternates: ["headers", "tab"],
      icon: markRaw(IconWindow),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    tab_authorization: {
      text: [
        this.t("spotlight.request.switch_to"),
        this.t("spotlight.request.tab_authorization"),
      ],
      alternates: ["authorization", "tab"],
      icon: markRaw(IconWindow),
      excludeFromSearch: computed(
        () => !this.isRESTPage.value ?? !this.isGQLPage.value
      ),
    },
    tab_pre_request_script: {
      text: [
        this.t("spotlight.request.switch_to"),
        this.t("spotlight.request.tab_pre_request_script"),
      ],
      alternates: ["pre-request", "script", "tab"],
      icon: markRaw(IconWindow),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
    },
    tab_tests: {
      text: [
        this.t("spotlight.request.switch_to"),
        this.t("spotlight.request.tab_tests"),
      ],
      alternates: ["tests", "tab"],
      icon: markRaw(IconWindow),
      excludeFromSearch: computed(() => !this.isRESTPage.value),
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
