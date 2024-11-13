<template>
  <HoppSmartModal
    dialog
    :title="t('collection_runner.run_collection')"
    @close="closeModal"
  >
    <template #body>
      <HoppSmartTabs v-model="activeTab">
        <HoppSmartTab id="test-runner" :label="t('collection_runner.ui')">
          <div
            class="flex-shrink-0 w-full h-full p-4 overflow-auto overflow-x-auto bg-primary"
          >
            <section>
              <h4 class="font-semibold text-secondaryDark">
                {{ t("collection_runner.run_config") }}
              </h4>
              <div class="mt-4">
                <!-- TODO: fix input component types. so that it accepts number -->
                <HoppSmartInput
                  v-model="config.delay as any"
                  type="number"
                  :label="t('collection_runner.delay')"
                  class="!rounded-r-none !border-r-0"
                  input-styles="floating-input !rounded-r-none !border-r-0"
                >
                  <template #button>
                    <span
                      class="px-4 py-2 font-semibold border rounded-r bg-primaryLight border-divider text-secondaryLight"
                    >
                      ms
                    </span>
                  </template>
                </HoppSmartInput>
              </div>
            </section>

            <section class="mt-6">
              <span class="text-xs text-secondaryLight">
                {{ t("collection_runner.advanced_settings") }}
              </span>

              <div class="flex flex-col gap-4 mt-4 items-start">
                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.stopOnError"
                  @change="config.stopOnError = !config.stopOnError"
                >
                  <span>
                    {{ t("collection_runner.stop_on_error") }}
                  </span>
                </HoppSmartCheckbox>

                <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.persistResponses"
                  @change="config.persistResponses = !config.persistResponses"
                >
                  <span>
                    {{ t("collection_runner.persist_responses") }}
                  </span>
                  <HoppButtonSecondary
                    class="!py-0 pl-2"
                    v-tippy="{ theme: 'tooltip' }"
                    to="https://docs.hoppscotch.io/documentation/features/inspections"
                    blank
                    :title="t('app.wiki')"
                    :icon="IconHelpCircle"
                  />
                </HoppSmartCheckbox>

                <!-- <HoppSmartCheckbox
                  class="pr-2"
                  :on="config.keepVariableValues"
                  @change="
                    config.keepVariableValues = !config.keepVariableValues
                  "
                >
                  <span>Keep variable values</span>
                  <HoppButtonSecondary
                    class="!py-0 pl-2"
                    v-tippy="{ theme: 'tooltip' }"
                    to="https://docs.hoppscotch.io/documentation/features/inspections"
                    blank
                    :title="t('app.wiki')"
                    :icon="IconHelpCircle"
                  />
                </HoppSmartCheckbox> -->
              </div>
            </section>
          </div>
        </HoppSmartTab>
        <HoppSmartTab
          id="cli"
          :label="`${t('collection_runner.cli')} ${
            !CLICommand ? '(Team Collections Only)' : ''
          }`"
          :disabled="!CLICommand"
        >
          <HttpTestEnv :show="false" @select-env="setCurrentEnv" />

          <div class="space-y-4 p-4">
            <p
              class="p-4 mb-4 border rounded-md text-amber-500 border-amber-600"
            >
              {{ cliCommandGenerationDescription }}
            </p>

            <div v-if="environmentID" class="flex gap-x-2 items-center">
              <HoppSmartCheckbox
                :on="includeEnvironmentID"
                @change="toggleIncludeEnvironment"
              />
              <span class="truncate"
                >{{ t("collection_runner.include_active_environment") }}
                <span class="text-secondaryDark">
                  {{ currentEnv?.name }}
                </span>
              </span>
            </div>

            <div
              class="p-4 rounded-md bg-primaryLight text-secondaryDark select-text"
            >
              {{ CLICommand }}
            </div>
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>

    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
          v-if="activeTab === 'test-runner'"
          :label="`${t('test.run')}`"
          :icon="IconPlay"
          outline
          @click="runTests"
        />
        <HoppButtonPrimary
          v-else
          :label="`${t('action.copy')}`"
          :icon="copyIcon"
          outline
          @click="copyCLICommandToClipboard"
        />
        <HoppButtonSecondary
          :label="`${t('action.close')}`"
          outline
          filled
          @click="closeModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { refAutoReset } from "@vueuse/core"
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"

import { HoppCollection } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { useToast } from "~/composables/toast"
import { TestRunnerConfig } from "~/helpers/rest/document"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { RESTTabService } from "~/services/tab/rest"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlay from "~icons/lucide/play"
import { CurrentEnv } from "./Env.vue"
import { pipe } from "fp-ts/lib/function"
import {
  getCompleteCollectionTree,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import * as TE from "fp-ts/TaskEither"
import { GQLError } from "~/helpers/backend/GQLClient"
import { cloneDeep } from "lodash-es"

const t = useI18n()
const toast = useToast()
const tabs = useService(RESTTabService)

const loadingCollection = ref(false)

export type CollectionRunnerData =
  | {
      type: "my-collections"
      collectionIndex?: string
      collection: HoppCollection
    }
  | {
      type: "team-collections"
      collectionID: string
    }

const props = defineProps<{
  sameTab?: boolean
  collectionRunnerData: CollectionRunnerData
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const includeEnvironmentID = ref(false)
const activeTab = ref("test-runner")

const environmentID = ref("")
const currentEnv = ref<CurrentEnv>(null)

function setCurrentEnv(payload: CurrentEnv) {
  currentEnv.value = payload
  if (payload?.type == "TEAM_ENV") {
    environmentID.value = payload.teamEnvID
  }
}

const config = ref<TestRunnerConfig>({
  iterations: 1,
  delay: 500,
  stopOnError: false,
  persistResponses: true,
  keepVariableValues: false,
})

const runTests = async () => {
  const collectionTree = await getCollectionTree(
    props.collectionRunnerData.type,
    props.collectionRunnerData.type === "my-collections"
      ? props.collectionRunnerData.collection
      : {
          id: props.collectionRunnerData.collectionID,
        }
  )

  if (!collectionTree) return

  let tabIdToClose = null
  if (props.sameTab) tabIdToClose = cloneDeep(tabs.currentTabID.value)

  tabs.createNewTab({
    type: "test-runner",
    collectionType: props.collectionRunnerData.type,
    collectionID:
      props.collectionRunnerData.type === "team-collections"
        ? props.collectionRunnerData.collectionID
        : null,
    collection: collectionTree as HoppCollection,
    isDirty: false,
    config: config.value,
    status: "idle",
    request: null,
    testRunnerMeta: {
      completedRequests: 0,
      totalRequests: 0,
      totalTime: 0,
      failedTests: 0,
      passedTests: 0,
      totalTests: 0,
    },
  })

  if (tabIdToClose) tabs.closeTab(tabIdToClose)

  emit("hide-modal")
}

/**
 * Fetches the collection tree from the backend
 * @param collection
 * @returns collection tree
 */
const getCollectionTree = async (
  type: CollectionRunnerData["type"],
  collection: HoppCollection | { id: string }
) => {
  if (type === "my-collections") {
    return collection
  } else {
    if (!collection.id) return
    loadingCollection.value = true

    console.log("Fetching collection tree for team collection", collection)

    return pipe(
      getCompleteCollectionTree(collection.id),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          loadingCollection.value = false
          return
        },
        async (coll) => {
          loadingCollection.value = false
          return teamCollToHoppRESTColl(coll)
        }
      )
    )()
  }
}

const getErrorMessage = (err: GQLError<string>) => {
  console.error(err)
  if (err.type === "network_error") {
    return t("error.network_error")
  }
  switch (err.error) {
    case "team_coll/short_title":
      return t("collection.name_length_insufficient")
    case "team/invalid_coll_id":
    case "bug/team_coll/no_coll_id":
    case "team_req/invalid_target_id":
      return t("team.invalid_coll_id")
    case "team/not_required_role":
      return t("profile.no_permission")
    case "team_req/not_required_role":
      return t("profile.no_permission")
    case "Forbidden resource":
      return t("profile.no_permission")
    case "team_req/not_found":
      return t("team.no_request_found")
    case "bug/team_req/no_req_id":
      return t("team.no_request_found")
    case "team/collection_is_parent_coll":
      return t("team.parent_coll_move")
    case "team/target_and_destination_collection_are_same":
      return t("team.same_target_destination")
    case "team/target_collection_is_already_root_collection":
      return t("collection.invalid_root_move")
    case "team_req/requests_not_from_same_collection":
      return t("request.different_collection")
    case "team/team_collections_have_different_parents":
      return t("collection.different_parent")
    default:
      return t("error.something_went_wrong")
  }
}

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const isCloudInstance = window.location.hostname === "hoppscotch.io"

const cliCommandGenerationDescription = computed(() => {
  if (isCloudInstance) {
    return t("collection_runner.cli_command_generation_description_cloud")
  }

  if (import.meta.env.VITE_BACKEND_API_URL) {
    return t("collection_runner.cli_command_generation_description_sh")
  }

  return t(
    "collection_runner.cli_command_generation_description_sh_with_server_url_placeholder"
  )
})

const CLICommand = computed(() => {
  if (props.collectionRunnerData.type === "team-collections") {
    const collectionID = props.collectionRunnerData.collectionID
    const environmentFlag =
      includeEnvironmentID.value && environmentID.value
        ? `-e ${environmentID.value}`
        : ""

    const serverUrl = import.meta.env.VITE_BACKEND_API_URL?.endsWith("/v1")
      ? // Removing `/v1` prefix
        import.meta.env.VITE_BACKEND_API_URL.slice(0, -3)
      : "<server_url>"

    const serverFlag = isCloudInstance ? "" : `--server ${serverUrl}`

    return `hopp test ${collectionID} ${environmentFlag} --token <access_token> ${serverFlag}`
  }

  return null
})

const toggleIncludeEnvironment = () => {
  includeEnvironmentID.value = !includeEnvironmentID.value
}

const copyCLICommandToClipboard = () => {
  copyToClipboard(CLICommand.value ?? "")
  copyIcon.value = IconCheck

  toast.success(`${t("state.copied_to_clipboard")}`)
}

const closeModal = () => {
  emit("hide-modal")
}
</script>
