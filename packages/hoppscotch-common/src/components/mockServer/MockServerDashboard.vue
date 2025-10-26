<template>
  <div>
    <div
      class="sticky z-10 flex flex-1 flex-shrink-0 justify-between overflow-x-auto border-b border-dividerLight bg-primary"
    >
      <HoppButtonSecondary
        v-if="!hasNoAccess"
        :icon="IconPlus"
        :label="t('action.new')"
        class="!rounded-none"
        @click="openCreateModal"
      />
      <HoppButtonSecondary
        v-else
        v-tippy="{ theme: 'tooltip' }"
        disabled
        class="!rounded-none"
        :icon="IconPlus"
        :title="t('team.no_access')"
        :label="t('action.new')"
      />
      <span class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/features/mock-servers"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
      </span>
    </div>

    <div class="flex flex-1 flex-col">
      <div
        v-if="loading"
        class="flex flex-1 flex-col items-center justify-center p-4"
      >
        <HoppSmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div
        v-else-if="mockServers.length === 0"
        class="flex flex-1 flex-col items-center justify-center p-4"
      >
        <img
          :src="`/images/states/${colorMode.value}/add_files.svg`"
          :alt="`${t('empty.mock_servers')}`"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4 opacity-75"
        />
        <span class="pb-4 text-center text-secondaryLight">
          {{ t("empty.mock_servers") }}
        </span>
        <HoppButtonSecondary
          v-if="!hasNoAccess"
          :label="t('mock_server.create_mock_server')"
          :icon="IconPlus"
          filled
          @click="openCreateModal"
        />
      </div>
      <div v-else class="divide-y divide-dividerLight">
        <div
          v-for="mockServer in mockServers"
          :key="mockServer.id"
          class="group flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-primaryLight"
        >
          <div class="flex min-w-0 flex-1 items-center">
            <div class="flex items-center justify-center px-2">
              <component
                :is="IconServer"
                class="svg-icons"
                :class="{
                  'text-green-500': mockServer.isActive,
                  'text-secondaryLight': !mockServer.isActive,
                }"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col py-2 pr-2">
              <span class="flex items-center space-x-2">
                <span class="truncate font-semibold text-secondaryDark">
                  {{ mockServer.name }}
                </span>
                <span
                  class="rounded-full px-2 py-1 text-xs"
                  :class="{
                    'bg-green-100 text-green-800': mockServer.isActive,
                    'bg-gray-100 text-gray-600': !mockServer.isActive,
                  }"
                >
                  {{
                    mockServer.isActive
                      ? t("mock_server.active")
                      : t("mock_server.inactive")
                  }}
                </span>
              </span>
              <span class="truncate text-secondaryLight">
                {{
                  mockServer.collection?.title || t("mock_server.no_collection")
                }}
              </span>
            </div>
          </div>
          <div class="flex">
            <HoppButtonSecondary
              v-if="
                mockServer.serverUrlDomainBased || mockServer.serverUrlPathBased
              "
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.copy')"
              :icon="copyIcon"
              class="hidden group-hover:inline-flex"
              @click="
                copyToClipboardHandler(
                  mockServer.serverUrlDomainBased ||
                    mockServer.serverUrlPathBased ||
                    ''
                )
              "
            />
            <HoppButtonSecondary
              v-if="!hasNoAccess"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.edit')"
              :icon="IconEdit"
              class="hidden group-hover:inline-flex"
              @click="editMockServer(mockServer)"
            />
            <span>
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => tippyActions!.focus()"
              >
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.more')"
                  :icon="IconMoreVertical"
                />
                <template #content="{ hide }">
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      :icon="mockServer.isActive ? IconStop : IconPlay"
                      :label="
                        mockServer.isActive
                          ? t('mock_server.stop_server')
                          : t('mock_server.start_server')
                      "
                      @click="
                        () => {
                          toggleMockServer(mockServer)
                          hide()
                        }
                      "
                    />
                    <HoppSmartItem
                      :icon="IconTrash2"
                      :label="t('action.delete')"
                      @click="
                        () => {
                          deleteMockServer(mockServer)
                          hide()
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <MockServerCreateMockServer
      v-if="showCreateModal"
      :show="showCreateModal"
      @hide-modal="showCreateModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useMockServerStatus } from "~/composables/mockServer"
import { useToast } from "~/composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { platform } from "~/platform"
import type { MockServer } from "~/newstore/mockServers"
import { loadMockServers, showCreateMockServerModal$ } from "~/newstore/mockServers"
import MockServerCreateMockServer from "~/components/mockServer/CreateMockServer.vue"

// Icons
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconServer from "~icons/lucide/server"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPlay from "~icons/lucide/play"
import IconStop from "~icons/lucide/stop-circle"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconMoreVertical from "~icons/lucide/more-vertical"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()
const { mockServers } = useMockServerStatus()

const loading = ref(false)
const showCreateModal = ref(false)
const copyIcon = ref(IconCopy)
const tippyActions = ref<TippyComponent | null>(null)

// Check if user has access (not logged in or no permissions)
const hasNoAccess = computed(() => {
  return !platform.auth.getCurrentUser()
})

const editMockServer = (mockServer: MockServer) => {
  // TODO: Implement edit functionality
  toast.info("Edit functionality coming soon")
}

const toggleMockServer = async (mockServer: MockServer) => {
  try {
    // TODO: Implement mock server start/stop functionality
    toast.success(
      mockServer.isActive
        ? t("mock_server.mock_server_stopped")
        : t("mock_server.mock_server_started")
    )
  } catch (error) {
    toast.error(t("error.something_went_wrong"))
  }
}

const deleteMockServer = async (mockServer: MockServer) => {
  if (confirm(t("confirm.delete_mock_server"))) {
    try {
      // TODO: Implement mock server deletion
      toast.success(t("state.deleted"))
    } catch (error) {
      toast.error(t("error.something_went_wrong"))
    }
  }
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

const openCreateModal = () => {
  // Open the create modal without a pre-selected collection
  showCreateMockServerModal$.next({
    show: true,
    collectionID: undefined,
    collectionName: undefined,
  })
}

// Load mock servers on component mount
onMounted(async () => {
  if (platform.auth.getCurrentUser()) {
    loading.value = true
    try {
      await loadMockServers()
    } catch (error) {
      console.error("Failed to load mock servers:", error)
    } finally {
      loading.value = false
    }
  }
})
</script>
