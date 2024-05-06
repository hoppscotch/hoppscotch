import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"
import { getI18n } from "~/modules/i18n"
import { Component, computed, markRaw, reactive } from "vue"
import { useStreamStatic } from "~/composables/stream"
import IconLogin from "~icons/lucide/log-in"
import IconLogOut from "~icons/lucide/log-out"
import { activeActions$, invokeAction } from "~/helpers/actions"
import { Container } from "dioc"

type Doc = {
  text: string
  excludeFromSearch?: boolean
  alternates: string[]
  icon: object | Component
}

/**
 * This searcher is responsible for providing user related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class UserSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "USER_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "user"
  public searcherSectionTitle = this.t("spotlight.section.user")

  private readonly spotlight = this.bind(SpotlightService)

  private activeActions = useStreamStatic(activeActions$, [], () => {
    /* noop */
  })[0]

  private hasLoginAction = computed(() =>
    this.activeActions.value.includes("user.login")
  )

  private hasLogoutAction = computed(() =>
    this.activeActions.value.includes("user.logout")
  )

  private documents: Record<string, Doc> = reactive({
    login: {
      text: this.t("auth.login"),
      excludeFromSearch: computed(() => !this.hasLoginAction.value),
      alternates: ["sign in", "log in"],
      icon: markRaw(IconLogin),
    },
    logout: {
      text: this.t("auth.logout"),
      excludeFromSearch: computed(() => !this.hasLogoutAction.value),
      alternates: ["sign out", "log out"],
      icon: markRaw(IconLogOut),
    },
  })

  // TODO: Constructors are no longer recommended as of dioc > 3, move to onServiceInit
  constructor(c: Container) {
    super(c, {
      searchFields: ["text", "alternates"],
      fieldWeights: {
        text: 2,
        alternates: 1,
      },
    })
  }

  override onServiceInit(): void {
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

  public onDocSelected(id: string): void {
    switch (id) {
      case "login":
        invokeAction("user.login")
        break
      case "logout":
        invokeAction("user.logout")
        break
    }
  }
}
