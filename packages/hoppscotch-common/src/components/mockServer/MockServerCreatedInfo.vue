<template>
  <div>
    <!-- Display created server info -->
    <div v-if="mockServer" class="flex flex-col mb-4 space-y-4">
      <div v-if="mockServer.serverUrlPathBased" class="flex flex-col space-y-2">
        <label class="text-sm font-semibold text-secondaryDark">
          {{ t("mock_server.path_based_url") }}
        </label>
        <div class="flex items-center space-x-2">
          <div
            class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight text-body font-mono"
          >
            {{ mockServer.serverUrlPathBased }}
          </div>
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :icon="copyIcon"
            @click="handleCopy(mockServer.serverUrlPathBased || '')"
          />
        </div>
      </div>

      <!-- Subdomain-based URL (May be null) -->
      <div
        v-if="mockServer.serverUrlDomainBased"
        class="flex flex-col space-y-2"
      >
        <label class="text-sm font-semibold text-secondaryDark">
          {{ t("mock_server.subdomain_based_url") }}
        </label>
        <div class="flex items-center space-x-2">
          <div
            class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight text-body font-mono"
          >
            {{ mockServer.serverUrlDomainBased }}
          </div>
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :icon="copyIcon"
            @click="handleCopy(mockServer.serverUrlDomainBased || '')"
          />
        </div>
      </div>
    </div>

    <!-- Help Text -->
    <div
      class="py-4 px-3 bg-primaryLight rounded-md border border-dividerLight shadow-sm"
    >
      <p class="text-secondary flex space-x-2 items-start">
        <Icon-lucide-info class="svg-icons text-accent" />
        <span>
          {{ t("mock_server.description") }}
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { refAutoReset } from "@vueuse/core"
import { MockServer } from "~/helpers/backend/graphql"
import { copyToClipboard as copyToClipboardHelper } from "~/helpers/utils/clipboard"

// Icons
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"

interface Props {
  mockServer: MockServer | null
}

defineProps<Props>()

const t = useI18n()
const toast = useToast()

// Copy functionality
const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const handleCopy = (text: string) => {
  copyToClipboardHelper(text)
  copyIcon.value = IconCheck
  toast.success(t("state.copied_to_clipboard"))
}
</script>
