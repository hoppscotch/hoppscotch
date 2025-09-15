<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mockServer.edit_modal.title')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-4">
        <!-- Mock Server Name -->
        <div class="flex flex-col">
          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.edit_modal.name_label") }}
          </label>
          <input
            v-model="mockServerName"
            type="text"
            class="input"
            :placeholder="t('mockServer.edit_modal.name_placeholder')"
            @keyup.enter="updateMockServer"
          />
        </div>

        <!-- Active Status -->
        <div class="flex items-center space-x-3">
          <input v-model="isActive" type="checkbox" class="checkbox" />
          <label class="text-secondary">
            {{ t("mockServer.edit_modal.active_label") }}
          </label>
        </div>

        <!-- Mock Server URL (Read-only) -->
        <div class="flex flex-col">
          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.edit_modal.url_label") }}
          </label>
          <div
            class="bg-primaryLight rounded-md p-3 flex items-center justify-between"
          >
            <p class="font-mono text-sm text-secondary break-all">
              {{ getMockServerUrl() }}
            </p>
            <HoppButtonSecondary :icon="IconCopy" size="sm" @click="copyUrl" />
          </div>
        </div>

        <!-- Collection Info (Read-only) -->
        <div class="flex flex-col">
          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.edit_modal.collection_label") }}
          </label>
          <p class="text-secondary">{{ getCollectionName() }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('mockServer.edit_modal.update_button')"
          :loading="loading"
          @click="updateMockServer"
        />
        <HoppButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import IconCopy from "~icons/lucide/copy"

const t = useI18n()
const toast = useToast()

// Props and emits
const props = defineProps<{
  show: boolean
  mockServer: any
}>()

const emit = defineEmits<{
  hide: []
  updated: [mockServer: any]
}>()

// Form state
const mockServerName = ref("")
const isActive = ref(true)
const loading = ref(false)

// Watch for prop changes
watch(
  () => props.mockServer,
  (newMockServer) => {
    if (newMockServer) {
      mockServerName.value = newMockServer.name
      isActive.value = newMockServer.isActive
    }
  },
  { immediate: true }
)

// Methods
function hideModal() {
  emit("hide")
}

function getMockServerUrl() {
  if (!props.mockServer) return ""
  // TODO: Get from environment config
  const baseUrl = "https://mock.hoppscotch.io"
  return `${baseUrl}/${props.mockServer.subdomain}`
}

function getCollectionName() {
  // TODO: Find collection name from collections store
  return "My Collection"
}

async function copyUrl() {
  const url = getMockServerUrl()
  await copyToClipboard(url)
  toast.success(t("mockServer.edit_modal.url_copied"))
}

async function updateMockServer() {
  if (!mockServerName.value.trim()) {
    toast.error(t("mockServer.edit_modal.name_required"))
    return
  }

  loading.value = true

  try {
    // TODO: Call GraphQL mutation to update mock server
    const updatedMockServer = {
      ...props.mockServer,
      name: mockServerName.value,
      isActive: isActive.value,
      updatedOn: new Date(),
    }

    emit("updated", updatedMockServer)
    toast.success(t("mockServer.edit_modal.success"))
    hideModal()
  } catch (error) {
    console.error("Error updating mock server:", error)
    toast.error(t("mockServer.edit_modal.error"))
  } finally {
    loading.value = false
  }
}
</script>
