<template>
  <HoppSmartModal
    v-if="show"
    styles="sm:max-w-lg"
    full-width
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col border-b transition border-divider">
        <div class="flex items-center">
          <input
            id="command"
            v-model="search"
            v-focus
            type="text"
            autocomplete="off"
            name="command"
            :placeholder="`${t('app.type_a_command_search')}`"
            class="flex flex-1 text-base bg-transparent text-secondaryDark px-6 py-5"
          />
          <HoppSmartSpinner v-if="searchSession?.loading" class="mr-6" />
        </div>
      </div>
      <div
        v-if="searchSession && search.length > 0"
        class="flex flex-col flex-1 overflow-y-auto border-b border-divider divide-y divide-dividerLight"
      >
        <div
          v-for="([sectionID, sectionResult], sectionIndex) in scoredResults"
          :key="`section-${sectionID}`"
          class="flex flex-col"
        >
          <h5
            class="px-6 py-2 bg-primaryContrast z-10 text-secondaryLight sticky top-0"
          >
            {{ sectionResult.title }}
          </h5>
          <AppSpotlightEntry
            v-for="(result, entryIndex) in sectionResult.results"
            :key="`result-${result.id}`"
            :entry="result"
            :active="isEqual(selectedEntry, [sectionIndex, entryIndex])"
            @mouseover="selectedEntry = [sectionIndex, entryIndex]"
            @action="runAction(sectionID, result)"
          />
        </div>
        <HoppSmartPlaceholder
          v-if="search.length > 0 && scoredResults.length === 0"
          :text="`${t('state.nothing_found')} ‟${search}”`"
        >
          <template #icon>
            <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
          </template>
          <HoppButtonSecondary
            :label="t('action.clear')"
            outline
            @click="search = ''"
          />
        </HoppSmartPlaceholder>
      </div>
      <div
        class="flex flex-shrink-0 text-tiny text-secondaryLight p-4 justify-between whitespace-nowrap overflow-auto <sm:hidden"
      >
        <div class="flex items-center">
          <kbd class="shortcut-key">↑</kbd>
          <kbd class="shortcut-key">↓</kbd>
          <span class="mx-2 truncate">
            {{ t("action.to_navigate") }}
          </span>
          <kbd class="shortcut-key">↩</kbd>
          <span class="ml-2 truncate">
            {{ t("action.to_select") }}
          </span>
        </div>
        <div class="flex items-center">
          <kbd class="shortcut-key">ESC</kbd>
          <span class="ml-2 truncate">
            {{ t("action.to_close") }}
          </span>
        </div>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useService } from "dioc/vue"
import { useI18n } from "@composables/i18n"
import {
  SpotlightService,
  SpotlightSearchState,
  SpotlightSearcherResult,
} from "~/services/spotlight"
import { isEqual } from "lodash-es"
import { HistorySpotlightSearcherService } from "~/services/spotlight/searchers/history.searcher"
import { UserSpotlightSearcherService } from "~/services/spotlight/searchers/user.searcher"
import { NavigationSpotlightSearcherService } from "~/services/spotlight/searchers/navigation.searcher"
import { SettingsSpotlightSearcherService } from "~/services/spotlight/searchers/settings.searcher"
import { CollectionsSpotlightSearcherService } from "~/services/spotlight/searchers/collections.searcher"
import { MiscellaneousSpotlightSearcherService } from "~/services/spotlight/searchers/miscellaneous.searcher"
import { TabSpotlightSearcherService } from "~/services/spotlight/searchers/tab.searcher"
import { GeneralSpotlightSearcherService } from "~/services/spotlight/searchers/general.searcher"
import { ResponseSpotlightSearcherService } from "~/services/spotlight/searchers/response.searcher"
import { RequestSpotlightSearcherService } from "~/services/spotlight/searchers/request.searcher"
import {
  EnvironmentsSpotlightSearcherService,
  SwitchEnvSpotlightSearcherService,
} from "~/services/spotlight/searchers/environment.searcher"
import {
  SwitchWorkspaceSpotlightSearcherService,
  WorkspaceSpotlightSearcherService,
} from "~/services/spotlight/searchers/workspace.searcher"
import { InterceptorSpotlightSearcherService } from "~/services/spotlight/searchers/interceptor.searcher"

const t = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const spotlightService = useService(SpotlightService)

useService(HistorySpotlightSearcherService)
useService(UserSpotlightSearcherService)
useService(NavigationSpotlightSearcherService)
useService(SettingsSpotlightSearcherService)
useService(CollectionsSpotlightSearcherService)
useService(MiscellaneousSpotlightSearcherService)
useService(TabSpotlightSearcherService)
useService(GeneralSpotlightSearcherService)
useService(ResponseSpotlightSearcherService)
useService(RequestSpotlightSearcherService)
useService(EnvironmentsSpotlightSearcherService)
useService(SwitchEnvSpotlightSearcherService)
useService(WorkspaceSpotlightSearcherService)
useService(SwitchWorkspaceSpotlightSearcherService)
useService(InterceptorSpotlightSearcherService)

const search = ref("")

const searchSession = ref<SpotlightSearchState>()
const stopSearchSession = ref<() => void>()

const scoredResults = computed(() =>
  Object.entries(searchSession.value?.results ?? {}).sort(
    ([, sectionA], [, sectionB]) => sectionB.avgScore - sectionA.avgScore
  )
)

const { selectedEntry } = newUseArrowKeysForNavigation()

watch(
  () => props.show,
  (show) => {
    search.value = ""

    if (show) {
      const [session, onSessionEnd] =
        spotlightService.createSearchSession(search)

      searchSession.value = session.value
      stopSearchSession.value = onSessionEnd
    } else {
      stopSearchSession.value?.()
      stopSearchSession.value = undefined
      searchSession.value = undefined
    }
  }
)

function runAction(searcherID: string, result: SpotlightSearcherResult) {
  spotlightService.selectSearchResult(searcherID, result)
  emit("hide-modal")
}

function newUseArrowKeysForNavigation() {
  const selectedEntry = ref<[number, number]>([0, 0]) // [sectionIndex, entryIndex]

  watch(search, () => {
    selectedEntry.value = [0, 0]
  })

  const onArrowDown = () => {
    // If no entries, do nothing
    if (scoredResults.value.length === 0) return

    const [sectionIndex, entryIndex] = selectedEntry.value

    const [, section] = scoredResults.value[sectionIndex]

    if (entryIndex < section.results.length - 1) {
      selectedEntry.value = [sectionIndex, entryIndex + 1]
    } else if (sectionIndex < scoredResults.value.length - 1) {
      selectedEntry.value = [sectionIndex + 1, 0]
    } else {
      selectedEntry.value = [0, 0]
    }
  }

  const onArrowUp = () => {
    // If no entries, do nothing
    if (scoredResults.value.length === 0) return

    const [sectionIndex, entryIndex] = selectedEntry.value

    if (entryIndex > 0) {
      selectedEntry.value = [sectionIndex, entryIndex - 1]
    } else if (sectionIndex > 0) {
      const [, section] = scoredResults.value[sectionIndex - 1]
      selectedEntry.value = [sectionIndex - 1, section.results.length - 1]
    } else {
      selectedEntry.value = [
        scoredResults.value.length - 1,
        scoredResults.value[scoredResults.value.length - 1][1].results.length -
          1,
      ]
    }
  }

  const onEnter = () => {
    // If no entries, do nothing
    if (scoredResults.value.length === 0) return

    const [sectionIndex, entryIndex] = selectedEntry.value
    const [sectionID, section] = scoredResults.value[sectionIndex]
    const result = section.results[entryIndex]

    runAction(sectionID, result)
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      e.stopPropagation()

      onArrowUp()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      e.stopPropagation()

      onArrowDown()
    } else if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()

      onEnter()
    }
  }

  watch(
    () => props.show,
    (show) => {
      if (show) {
        window.addEventListener("keydown", handleKeyPress)
      } else {
        window.removeEventListener("keydown", handleKeyPress)
      }
    }
  )

  return { selectedEntry }
}
</script>
