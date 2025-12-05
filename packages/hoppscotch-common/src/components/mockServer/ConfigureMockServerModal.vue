<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="
      isExistingMockServer
        ? t('mock_server.mock_server_configuration')
        : t('mock_server.create_mock_server')
    "
    @close="closeModal"
  >
    <template #body>
      <div class="flex flex-col space-y-6">
        <!-- Collection Info (Read-only) -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("collection.title") }}
          </label>
          <div class="text-body text-secondary">
            {{ collectionName }}
          </div>
        </div>

        <!-- Existing Mock Server Info -->
        <div v-if="isExistingMockServer" class="flex flex-col space-y-4">
          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("mock_server.mock_server_name") }}
            </label>
            <div class="text-body text-secondary">
              {{ existingMockServer?.name }}
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("mock_server.base_url") }}
            </label>
            <div class="flex items-center space-x-2">
              <div
                class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight"
              >
                {{
                  existingMockServer?.serverUrlPathBased ||
                  existingMockServer?.serverUrlDomainBased ||
                  ""
                }}
              </div>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.copy')"
                :icon="copyIcon"
                @click="
                  copyToClipboard(
                    existingMockServer?.serverUrlPathBased ||
                      existingMockServer?.serverUrlDomainBased ||
                      ''
                  )
                "
              />
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("app.status") }}
            </label>
            <div class="flex items-center space-x-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="
                  existingMockServer?.isActive
                    ? 'bg-green-600/20 text-green-500 border border-green-600/30'
                    : 'text-secondary border border-secondaryLight'
                "
              >
                <span
                  class="w-2 h-2 rounded-full mr-2"
                  :class="
                    existingMockServer?.isActive
                      ? 'bg-green-400'
                      : 'bg-secondaryLight'
                  "
                ></span>
                {{
                  existingMockServer?.isActive
                    ? t("mockServer.dashboard.active")
                    : t("mockServer.dashboard.inactive")
                }}
              </span>
            </div>
          </div>
        </div>

        <!-- New Mock Server Form -->
        <div v-else class="flex flex-col space-y-6">
          <HoppSmartInput
            v-model="mockServerName"
            v-focus
            :label="t('mock_server.mock_server_name')"
            input-styles="floating-input"
            :disabled="loading"
          />
          <div class="flex items-center space-x-4">
            <div class="w-48">
              <HoppSmartInput
                v-model="delayInMsVal"
                :label="t('mock_server.delay_ms')"
                type="number"
                input-styles="floating-input"
                :disabled="loading"
              />
            </div>

            <div class="flex items-center">
              <HoppSmartToggle :on="isPublic" @change="isPublic = !isPublic">
                {{ t("mock_server.make_public") }}
              </HoppSmartToggle>
            </div>
          </div>
          <!-- Hint for private mock servers -->
          <div v-if="!isPublic" class="w-full mt-2 text-xs text-secondaryLight">
            {{ t("mock_server.private_access_instruction") }}
            <HoppSmartAnchor
              class="link"
              to="/profile/tokens"
              blank
              :icon="IconExternalLink"
              :label="t('mock_server.create_token_here')"
              reverse
            />
          </div>

          <!-- Set in Environment Toggle -->
          <div class="flex flex-col space-y-2">
            <div class="flex items-center">
              <HoppSmartToggle
                :on="setInEnvironment"
                @change="setInEnvironment = !setInEnvironment"
              >
                {{ t("mock_server.set_in_environment") }}
              </HoppSmartToggle>
            </div>
            <div
              v-if="setInEnvironment"
              class="w-full text-xs text-secondaryLight"
            >
              {{ t("mock_server.set_in_environment_hint") }}
            </div>
          </div>

          <MockServerCreatedInfo :mock-server="createdServer" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <!-- Start/Stop Server Button for existing mock server -->
        <HoppButtonPrimary
          v-if="isExistingMockServer"
          :label="
            existingMockServer?.isActive
              ? t('mock_server.stop_server')
              : t('mock_server.start_server')
          "
          :loading="loading"
          :icon="existingMockServer?.isActive ? IconSquare : IconPlay"
          @click="handleToggleMockServer"
        />

        <!-- Create Mock Server Button for new mock server -->
        <HoppButtonPrimary
          v-else
          :label="t('mock_server.create_mock_server')"
          :loading="loading"
          :disabled="!mockServerName.trim() || !collectionID"
          :icon="IconServer"
          @click="handleCreateMockServer"
        />

        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          @click="closeModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { refAutoReset } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { MockServer } from "~/helpers/backend/graphql"
import { copyToClipboard as copyToClipboardHelper } from "~/helpers/utils/clipboard"
import {
  mockServers$,
  showCreateMockServerModal$,
} from "~/newstore/mockServers"
import { useMockServer } from "~/composables/useMockServer"
import MockServerCreatedInfo from "~/components/mockServer/MockServerCreatedInfo.vue"

// Icons
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconPlay from "~icons/lucide/play"
import IconServer from "~icons/lucide/server"
import IconSquare from "~icons/lucide/square"
import IconExternalLink from "~icons/lucide/external-link"

const t = useI18n()
const toast = useToast()

// Use the composable for shared logic
const { createMockServer, toggleMockServer } = useMockServer()

// Modal state
const modalData = useReadonlyStream(showCreateMockServerModal$, {
  show: false,
  collectionID: undefined,
  collectionName: undefined,
})

const mockServers = useReadonlyStream(mockServers$, [])

// Component state
const mockServerName = ref("")
const loading = ref(false)
const createdServer = ref<MockServer | null>(null)
const delayInMsVal = ref<string>("0")
const isPublic = ref<boolean>(true)
const setInEnvironment = ref<boolean>(true)

// Props computed from modal data
// This modal only shows when collectionID is provided (from collection context menu)
const show = computed(
  () => modalData.value.show && !!modalData.value.collectionID
)
const collectionID = computed(() => modalData.value.collectionID)
const collectionName = computed(
  () => modalData.value.collectionName || "Unknown Collection"
)

// Find existing mock server for the collection
const existingMockServer = computed(() => {
  const collId = collectionID.value
  if (!collId) return null
  return mockServers.value.find((server) => server.collectionID === collId)
})

const isExistingMockServer = computed(() => !!existingMockServer.value)

// Copy functionality for existing mock server
const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const copyToClipboard = (text: string) => {
  copyToClipboardHelper(text)
  copyIcon.value = IconCheck
  toast.success(t("state.copied_to_clipboard"))
}

// Create new mock server
const handleCreateMockServer = async () => {
  if (!mockServerName.value.trim() || !collectionID.value) {
    return
  }

  loading.value = true

  const result = await createMockServer({
    mockServerName: mockServerName.value,
    collectionID: collectionID.value,
    delayInMs: Number(delayInMsVal.value) || 0,
    isPublic: isPublic.value,
    setInEnvironment: setInEnvironment.value,
    collectionName: collectionName.value,
  })

  loading.value = false

  if (result.success && result.server) {
    createdServer.value = result.server
  }
}

// Toggle mock server active state
const handleToggleMockServer = async () => {
  if (!existingMockServer.value) return

  loading.value = true
  await toggleMockServer(existingMockServer.value as any)
  loading.value = false
}

// Close modal
const closeModal = () => {
  showCreateMockServerModal$.next({
    show: false,
    collectionID: undefined,
    collectionName: undefined,
  })
}

// Reset form when modal opens/closes
watch(show, (newShow) => {
  if (newShow) {
    mockServerName.value = ""
    loading.value = false
    delayInMsVal.value = "0"
    isPublic.value = true
    setInEnvironment.value = true
    createdServer.value = null
  }
})
</script>
