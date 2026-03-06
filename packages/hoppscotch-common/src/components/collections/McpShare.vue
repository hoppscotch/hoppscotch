<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mcp.modal_title')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-4 p-4">
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-4">
          <HoppSmartSpinner />
        </div>

        <!-- Error state -->
        <p v-else-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <!-- Share exists: show URL + client snippets + revoke -->
        <template v-else-if="activeShare">
          <!-- Path-based URL -->
          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("mcp.url_label") }}
            </label>
            <div class="flex items-center space-x-2">
              <div
                class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight text-body font-mono text-xs overflow-x-auto"
              >
                {{ activeShare.shareUrlPathBased }}
              </div>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('mcp.copy_url')"
                :icon="copyPathIcon"
                @click="handleCopy(activeShare.shareUrlPathBased, 'path')"
              />
            </div>
          </div>

          <!-- Domain-based URL (optional) -->
          <div
            v-if="activeShare.shareUrlDomainBased"
            class="flex flex-col space-y-2"
          >
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("mcp.url_label") }} (domain)
            </label>
            <div class="flex items-center space-x-2">
              <div
                class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight text-body font-mono text-xs overflow-x-auto"
              >
                {{ activeShare.shareUrlDomainBased }}
              </div>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('mcp.copy_url')"
                :icon="copyDomainIcon"
                @click="
                  handleCopy(activeShare.shareUrlDomainBased ?? '', 'domain')
                "
              />
            </div>
          </div>

          <!-- Setup hint -->
          <p class="text-sm text-secondary">{{ t("mcp.setup_hint") }}</p>

          <!-- Client snippets tabs -->
          <div class="flex flex-col space-y-2">
            <div class="flex space-x-2">
              <button
                v-for="tab in tabs"
                :key="tab"
                class="px-3 py-1 rounded text-sm"
                :class="
                  activeTab === tab
                    ? 'bg-accent text-white'
                    : 'bg-primaryLight text-secondary hover:bg-primaryDark'
                "
                @click="activeTab = tab"
              >
                {{ t(`mcp.setup_${tab}`) }}
              </button>
            </div>
            <div
              class="px-3 py-2 border border-divider rounded bg-primaryLight font-mono text-xs whitespace-pre overflow-x-auto"
            >{{ snippetForTab }}</div>
          </div>

          <!-- Revoke button -->
          <HoppButtonSecondary
            :loading="revoking"
            :label="t('mcp.revoke')"
            class="text-red-500 border-red-300 hover:bg-red-50"
            @click="handleRevoke"
          />
        </template>

        <!-- No share yet: generate button -->
        <template v-else>
          <p class="text-secondary text-sm">
            {{ t("mcp.setup_hint") }}
          </p>
          <HoppButtonPrimary
            :loading="generating"
            :label="t('mcp.generate')"
            @click="handleGenerate"
          />
        </template>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { refAutoReset } from "@vueuse/core"
import { copyToClipboard as copyToClipboardHelper } from "~/helpers/utils/clipboard"
import {
  createMcpShare,
  deleteMcpShare,
  getMyMcpShares,
  McpShareResult,
} from "~/helpers/backend/mutations/McpShare"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"

const props = defineProps<{
  show: boolean
  collectionID: string
  workspaceType: "USER" | "TEAM"
}>()

const emit = defineEmits<{
  (event: "hide-modal"): void
}>()

const t = useI18n()
const toast = useToast()

const loading = ref(false)
const generating = ref(false)
const revoking = ref(false)
const error = ref<string | null>(null)
const activeShare = ref<McpShareResult | null>(null)
const activeTab = ref<"claude" | "cursor" | "windsurf">("claude")

const tabs = ["claude", "cursor", "windsurf"] as const

const copyPathIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)
const copyDomainIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const snippetForTab = computed(() => {
  const url = activeShare.value?.shareUrlPathBased ?? ""
  if (activeTab.value === "claude") {
    return JSON.stringify(
      {
        mcpServers: {
          hoppscotch: { url },
        },
      },
      null,
      2
    )
  }
  if (activeTab.value === "cursor") {
    return JSON.stringify(
      {
        mcpServers: [{ name: "hoppscotch", url }],
      },
      null,
      2
    )
  }
  // windsurf
  return JSON.stringify(
    {
      mcp: {
        servers: [{ name: "hoppscotch", url }],
      },
    },
    null,
    2
  )
})

const handleCopy = (text: string, which: "path" | "domain") => {
  copyToClipboardHelper(text)
  if (which === "path") copyPathIcon.value = IconCheck
  else copyDomainIcon.value = IconCheck
  toast.success(t("mcp.copied"))
}

const loadExistingShare = async () => {
  loading.value = true
  error.value = null
  try {
    const task = getMyMcpShares()
    const result = await task()
    if (result._tag === "Right") {
      const shares = result.right as McpShareResult[]
      activeShare.value =
        shares.find(
          (s) => s.collectionID === props.collectionID && s.isActive
        ) ?? null
    }
  } catch {
    error.value = t("error.something_went_wrong")
  } finally {
    loading.value = false
  }
}

const handleGenerate = async () => {
  generating.value = true
  error.value = null
  try {
    const task = createMcpShare(props.collectionID, props.workspaceType)
    const result = await task()
    if (result._tag === "Right") {
      activeShare.value = result.right as McpShareResult
      toast.success(t("state.success"))
    } else {
      error.value = t("error.something_went_wrong")
    }
  } catch {
    error.value = t("error.something_went_wrong")
  } finally {
    generating.value = false
  }
}

const handleRevoke = async () => {
  if (!activeShare.value) return
  revoking.value = true
  error.value = null
  try {
    const task = deleteMcpShare(activeShare.value.shareToken)
    const result = await task()
    if (result._tag === "Right") {
      activeShare.value = null
      toast.success(t("mcp.revoked"))
    } else {
      error.value = t("error.something_went_wrong")
    }
  } catch {
    error.value = t("error.something_went_wrong")
  } finally {
    revoking.value = false
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      activeShare.value = null
      error.value = null
      loadExistingShare()
    }
  },
  { immediate: true }
)
</script>
