<template>
  <HoppSmartModal
    dialog
    :title="t('collection_runner.run_collection')"
    @close="closeModal"
  >
    <template #body>
      <HoppSmartTabs v-model="activeTab">
        <HoppSmartTab id="cli" :label="t('collection_runner.cli')">
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
                <span class="text-secondaryDark">{{
                  activeEnvironment
                }}</span></span
              >
            </div>

            <div
              class="p-4 rounded-md bg-primaryLight text-secondaryDark select-text"
            >
              {{ generatedCLICommand }}
            </div>
          </div>
        </HoppSmartTab>

        <HoppSmartTab id="runner" disabled :label="t('collection_runner.ui')" />
      </HoppSmartTabs>
    </template>

    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
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

import { useToast } from "~/composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { SelectedEnvironmentIndex } from "~/newstore/environments"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  collectionID: string
  environmentID?: string | null
  selectedEnvironmentIndex: SelectedEnvironmentIndex
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const includeEnvironmentID = ref(false)
const activeTab = ref("cli")

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const activeEnvironment = computed(() => {
  const selectedEnv = props.selectedEnvironmentIndex

  if (selectedEnv.type === "TEAM_ENV") {
    return selectedEnv.environment.name
  }

  return null
})

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

const generatedCLICommand = computed(() => {
  const { collectionID, environmentID } = props

  const environmentFlag =
    includeEnvironmentID.value && environmentID ? `-e ${environmentID}` : ""

  const serverUrl = import.meta.env.VITE_BACKEND_API_URL?.endsWith("/v1")
    ? // Removing `/v1` prefix
      import.meta.env.VITE_BACKEND_API_URL.slice(0, -3)
    : "<server_url>"

  const serverFlag = isCloudInstance ? "" : `--server ${serverUrl}`

  return `hopp test ${collectionID} ${environmentFlag} --token <access_token> ${serverFlag}`
})

const toggleIncludeEnvironment = () => {
  includeEnvironmentID.value = !includeEnvironmentID.value
}

const copyCLICommandToClipboard = () => {
  copyToClipboard(generatedCLICommand.value)
  copyIcon.value = IconCheck

  toast.success(`${t("state.copied_to_clipboard")}`)
}

const closeModal = () => {
  emit("hide-modal")
}
</script>
