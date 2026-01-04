<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mock_server.edit_mock_server')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-6">
        <!-- Mock Server Name -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("mock_server.mock_server_name") }}
          </label>
          <input
            v-model="mockServerName"
            type="text"
            class="input"
            :placeholder="t('mock_server.mock_server_name_placeholder')"
          />
        </div>

        <!-- Collection Info (Read-only) -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("collection.title") }}
          </label>
          <div class="text-body text-secondary">
            {{ mockServer.collection?.title || t("mock_server.no_collection") }}
          </div>
        </div>

        <!-- Base URL (Read-only) -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("mock_server.base_url") }}
          </label>
          <div class="flex items-center space-x-2">
            <div
              class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight"
            >
              {{
                mockServer.serverUrlDomainBased || mockServer.serverUrlPathBased
              }}
            </div>
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.copy')"
              :icon="copyIcon"
              @click="
                copyToClipboardHandler(
                  mockServer.serverUrlDomainBased ||
                    mockServer.serverUrlPathBased ||
                    ''
                )
              "
            />
          </div>
        </div>

        <!-- Status Display (Read-only) -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("app.status") }}
          </label>
          <div class="flex items-center space-x-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :class="
                isActive
                  ? 'bg-green-600/20 text-green-500 border border-green-600/30'
                  : 'text-secondary border border-secondaryLight'
              "
            >
              <span
                class="w-2 h-2 rounded-full mr-2"
                :class="isActive ? 'bg-green-400' : 'bg-secondaryLight'"
              ></span>
              {{
                isActive
                  ? t("mockServer.dashboard.active")
                  : t("mockServer.dashboard.inactive")
              }}
            </span>
          </div>
        </div>

        <!-- Delay Settings -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("mock_server.delay_ms") }}
          </label>
          <input
            v-model.number="delayInMs"
            type="number"
            min="0"
            class="input"
            :placeholder="t('mock_server.delay_placeholder')"
          />
          <span class="text-xs text-secondaryLight">
            {{ t("mock_server.delay_description") }}
          </span>
        </div>

        <!-- Public Access -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("mock_server.public_access") }}
          </label>
          <div class="flex items-center space-x-3">
            <HoppSmartToggle :on="isPublic" @change="isPublic = !isPublic" />
            <span class="text-secondaryLight">
              {{
                isPublic
                  ? t("mock_server.public_description")
                  : t("mock_server.private_description")
              }}
            </span>
          </div>
          <div v-if="!isPublic" class="text-xs text-secondaryLight">
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
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <!-- Start/Stop Server Button (consistent with CreateMockServer) -->
        <HoppButtonPrimary
          :label="
            isActive
              ? t('mock_server.stop_server')
              : t('mock_server.start_server')
          "
          :loading="loading"
          :icon="isActive ? IconSquare : IconPlay"
          @click="toggleMockServer"
        />

        <!-- Save button for other settings -->
        <HoppButtonSecondary
          outline
          :label="t('action.save')"
          :loading="loading"
          @click="updateMockServer"
        />

        <HoppButtonSecondary
          :label="t('action.cancel')"
          @click="emit('hide-modal')"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { ref, watch } from "vue"
import { useToast } from "~/composables/toast"
import { updateMockServer as updateMockServerMutation } from "~/helpers/backend/mutations/MockServer"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import type { MockServer } from "~/newstore/mockServers"
import { updateMockServer as updateMockServerInStore } from "~/newstore/mockServers"

// Icons
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconPlay from "~icons/lucide/play"
import IconSquare from "~icons/lucide/square"
import IconExternalLink from "~icons/lucide/external-link"

interface Props {
  show: boolean
  mockServer: MockServer
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: "hide-modal"): void
}>()

const t = useI18n()
const toast = useToast()

const loading = ref(false)
const copyIcon = ref(IconCopy)

// Form data
const mockServerName = ref(props.mockServer.name)
const isActive = ref(props.mockServer.isActive)
const delayInMs = ref(props.mockServer.delayInMs || 0)
const isPublic = ref(props.mockServer.isPublic)

// Watch for prop changes
watch(
  () => props.mockServer,
  (newMockServer) => {
    mockServerName.value = newMockServer.name
    isActive.value = newMockServer.isActive
    delayInMs.value = newMockServer.delayInMs || 0
    isPublic.value = newMockServer.isPublic
  },
  { immediate: true }
)

const updateMockServer = async () => {
  loading.value = true

  // Prepare payload
  const payload = {
    name: mockServerName.value,
    isActive: isActive.value,
    delayInMs: delayInMs.value,
    isPublic: isPublic.value,
  }

  await pipe(
    updateMockServerMutation(props.mockServer.id, payload),
    TE.match(
      () => {
        toast.error(t("error.something_went_wrong"))
        loading.value = false
      },
      () => {
        // Update the mock server in the store with the changed fields
        updateMockServerInStore(props.mockServer.id, payload)

        toast.success(t("mock_server.mock_server_updated"))
        emit("hide-modal")

        // Update local state in case parent doesn't refresh immediately
        mockServerName.value = payload.name
        isActive.value = payload.isActive
        delayInMs.value = payload.delayInMs || 0
        isPublic.value = payload.isPublic

        loading.value = false
      }
    )
  )()
}

// Toggle mock server active state (consistent with CreateMockServer)
const toggleMockServer = async () => {
  loading.value = true
  const newActiveState = !isActive.value

  await pipe(
    updateMockServerMutation(props.mockServer.id, { isActive: newActiveState }),
    TE.match(
      () => {
        toast.error(t("error.something_went_wrong"))
        loading.value = false
      },
      () => {
        toast.success(
          newActiveState
            ? t("mock_server.mock_server_started")
            : t("mock_server.mock_server_stopped")
        )

        // Update the mock server in the store
        updateMockServerInStore(props.mockServer.id, {
          isActive: newActiveState,
        })

        // Update local state
        isActive.value = newActiveState

        loading.value = false
      }
    )
  )()
}

const copyToClipboardHandler = async (text: string) => {
  try {
    await copyToClipboard(text)
    copyIcon.value = IconCheck
    toast.success(t("state.copied_to_clipboard"))
    setTimeout(() => {
      copyIcon.value = IconCopy
    }, 1000)
  } catch (error) {
    toast.error(t("error.copy_failed"))
  }
}
</script>
