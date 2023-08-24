import {
  Component,
  Ref,
  computed,
  effectScope,
  markRaw,
  reactive,
  ref,
  watch,
} from "vue"
import { activeActions$, invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import {
  SpotlightSearcher,
  SpotlightSearcherResult,
  SpotlightSearcherSessionState,
  SpotlightService,
} from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconCopy from "~icons/lucide/copy"
import IconEdit from "~icons/lucide/edit"
import IconLayers from "~icons/lucide/layers"
import IconTrash2 from "~icons/lucide/trash-2"

import { Service } from "dioc"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { cloneDeep } from "lodash-es"
import MiniSearch from "minisearch"
import { map } from "rxjs"
import { useStreamStatic } from "~/composables/stream"
import { GQLError } from "~/helpers/backend/GQLClient"
import { deleteTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import {
  createEnvironment,
  currentEnvironment$,
  duplicateEnvironment,
  environmentsStore,
  getGlobalVariables,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"

type Doc = {
  text: string
  alternates: string[]
  icon: object | Component
  excludeFromSearch?: boolean
}

/**
 *
 * This searcher is responsible for providing environments related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class EnvironmentsSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "ENVIRONMENTS_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "environments"
  public searcherSectionTitle = this.t("spotlight.environments.title")

  private readonly spotlight = this.bind(SpotlightService)

  private selectedEnvIndex = useStreamStatic(
    selectedEnvironmentIndex$,
    {
      type: "NO_ENV_SELECTED",
    },
    () => {
      /* noop */
    }
  )[0]

  private selectedEnv = useStreamStatic(currentEnvironment$, null, () => {
    /* noop */
  })[0]

  private hasSelectedEnv = computed(
    () => this.selectedEnvIndex.value?.type !== "NO_ENV_SELECTED"
  )

  private documents: Record<string, Doc> = reactive({
    new_environment: {
      text: this.t("spotlight.environments.new"),
      alternates: ["new", "environment"],
      icon: markRaw(IconLayers),
    },
    new_environment_variable: {
      text: this.t("spotlight.environments.new_variable"),
      alternates: ["new", "environment", "variable"],
      icon: markRaw(IconLayers),
    },
    edit_selected_env: {
      text: this.t("spotlight.environments.edit"),
      alternates: ["edit", "environment"],
      icon: markRaw(IconEdit),
      excludeFromSearch: computed(() => !this.hasSelectedEnv.value),
    },
    delete_selected_env: {
      text: this.t("spotlight.environments.delete"),
      alternates: ["delete", "environment"],
      icon: markRaw(IconTrash2),
      excludeFromSearch: computed(() => !this.hasSelectedEnv.value),
    },
    duplicate_selected_env: {
      text: this.t("spotlight.environments.duplicate"),
      alternates: ["duplicate", "environment"],
      icon: markRaw(IconCopy),
      excludeFromSearch: computed(() => !this.hasSelectedEnv.value),
    },
    edit_global_env: {
      text: this.t("spotlight.environments.edit_global"),
      alternates: ["edit", "global", "environment"],
      icon: markRaw(IconEdit),
    },
    duplicate_global_env: {
      text: this.t("spotlight.environments.duplicate_global"),
      alternates: ["duplicate", "global", "environment"],
      icon: markRaw(IconCopy),
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

  private getSelectedText() {
    const selection = window.getSelection()
    return selection?.toString() ?? ""
  }

  duplicateGlobalEnv() {
    createEnvironment(
      `Global - ${this.t("action.duplicate")}`,
      cloneDeep(getGlobalVariables())
    )
    // this.toast.success(`${t("environment.duplicated")}`)
  }

  duplicateSelectedEnv() {
    if (this.selectedEnvIndex.value?.type === "NO_ENV_SELECTED") return

    if (this.selectedEnvIndex.value?.type === "MY_ENV") {
      duplicateEnvironment(this.selectedEnvIndex.value.index)
      // this.toast.success(`${t("environment.duplicated")}`)
    }

    if (this.selectedEnvIndex.value?.type === "TEAM_ENV") {
      pipe(
        deleteTeamEnvironment(this.selectedEnvIndex.value.teamEnvID),
        TE.match(
          (err: GQLError<string>) => {
            console.error(err)
          },
          () => {
            // this.toast.success(`${this.t("environment.duplicated")}`)
          }
        )
      )()
    }
  }

  public onDocSelected(id: string): void {
    switch (id) {
      case "new_environment":
        invokeAction(`modals.environment.new`)
        break
      case "new_environment_variable":
        invokeAction(`modals.environment.add`, {
          envName: "",
          variableName: this.getSelectedText(),
        })
        break
      case "edit_selected_env":
        if (this.selectedEnv.value)
          invokeAction(`modals.my.environment.edit`, {
            envName: this.selectedEnv.value.name,
          })
        break
      case "delete_selected_env":
        invokeAction(`modals.environment.delete-selected`)
        break
      case "duplicate_selected_env":
        this.duplicateSelectedEnv()
        break
      case "edit_global_env":
        invokeAction(`modals.my.environment.edit`, {
          envName: "Global",
        })
        break
      case "duplicate_global_env":
        this.duplicateGlobalEnv()
        break
    }
  }
}

/**
 * This searcher is responsible for searching through the environment.
 * And switching between them.
 */
export class SwitchEnvSpotlightSearcherService
  extends Service
  implements SpotlightSearcher
{
  public static readonly ID = "SWITCH_ENV_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public searcherID = "switch_env"
  public searcherSectionTitle = this.t("tab.environments")

  private readonly spotlight = this.bind(SpotlightService)

  constructor() {
    super()

    this.spotlight.registerSearcher(this)
  }

  private environmentSearchable = useStreamStatic(
    activeActions$.pipe(
      map((actions) => actions.includes("modals.environment.add"))
    ),
    activeActions$.value.includes("modals.environment.add"),
    () => {
      /* noop */
    }
  )[0]

  createSearchSession(
    query: Readonly<Ref<string>>
  ): [Ref<SpotlightSearcherSessionState>, () => void] {
    const loading = ref(false)
    const results = ref<SpotlightSearcherResult[]>([])

    const minisearch = new MiniSearch({
      fields: ["name"],
      storeFields: ["name"],
    })

    if (this.environmentSearchable.value) {
      minisearch.addAll(
        environmentsStore.value.environments.map((entry, index) => {
          return {
            id: `environment-${index}`,
            name: entry.name,
          }
        })
      )
    }

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      watch(
        [query],
        ([query]) => {
          results.value = minisearch
            .search(query, {
              prefix: true,
              fuzzy: true,
              boost: {
                reltime: 2,
              },
              weights: {
                fuzzy: 0.2,
                prefix: 0.8,
              },
            })
            .map((x) => {
              return {
                id: x.id,
                icon: markRaw(IconLayers),
                score: x.score,
                text: {
                  type: "text",
                  text: [this.t("environment.set"), x.name],
                },
              }
            })
        },
        { immediate: true }
      )
    })

    const onSessionEnd = () => {
      scopeHandle.stop()
      minisearch.removeAll()
    }

    const resultObj = computed<SpotlightSearcherSessionState>(() => ({
      loading: loading.value,
      results: results.value,
    }))

    return [resultObj, onSessionEnd]
  }

  onResultSelect(result: SpotlightSearcherResult): void {
    const selectedEnvIndex = Number(result.id.split("-")[1])
    setSelectedEnvironmentIndex({
      type: "MY_ENV",
      index: selectedEnvIndex,
    })
  }
}
