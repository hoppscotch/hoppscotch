<template>
  <HoppSmartModal dialog title="Run configuration" @close="closeModal">
    <template #body>
      <HoppSmartTabs v-model="activeTab">
        <HoppSmartTab id="cli" label="CLI">
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
                >Include active environment:
                <span class="text-secondaryDark">{{
                  activeEnvironment
                }}</span></span
              >
            </div>

            <div class="p-4 rounded-md bg-primaryLight text-secondaryDark">
              {{ generatedCLICommand }}
            </div>
          </div>
        </HoppSmartTab>

        <HoppSmartTab id="runner" disabled label="Runner (coming soon)" />
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
          :label="`${t('action.dismiss')}`"
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
  collectionID: string | null
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
    return "Copy the below command and run it from the CLI. Please specify a personal access token."
  }

  const serverUrlCopy = import.meta.env.VITE_BACKEND_API_URL
    ? "verify the generated SH instance server URL"
    : "the SH instance server URL"

  return `Copy the below command and run it from the CLI. Please specify a personal access token and ${serverUrlCopy}.`
})

const generatedCLICommand = computed(() => {
  const { collectionID, environmentID } = props

  if (!collectionID) {
    return ""
  }

  const environmentFlag = includeEnvironmentID.value
    ? environmentID
      ? `-e ${environmentID}`
      : ""
    : ""

  const serverUrl =
    // Removing `/v1` prefix
    import.meta.env.VITE_BACKEND_API_URL.slice(0, -3) || "<server_url>"

  const serverFlag = isCloudInstance ? ":" : `--server ${serverUrl}`

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
