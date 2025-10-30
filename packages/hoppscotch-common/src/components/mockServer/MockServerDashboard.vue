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
      <div v-else class="flex flex-1 flex-col space-y-2 py-2">
        <div
          v-for="mockServer in mockServers"
          :key="mockServer.id"
          class="group flex items-stretch"
        >
          <span
            class="flex cursor-pointer items-center justify-center px-4"
            @click="openMockServerLogs(mockServer)"
          >
            <component
              :is="IconServer"
              class="svg-icons"
              :class="{
                'text-green-500': mockServer.isActive,
                'text-secondaryLight': !mockServer.isActive,
              }"
            />
          </span>
          <span
            class="flex min-w-0 flex-1 cursor-pointer pr-2 transition group-hover:text-secondaryDark"
            @click="openMockServerLogs(mockServer)"
          >
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-semibold">
                {{ mockServer.name }}
              </span>
              <span class="truncate text-secondaryLight">
                {{
                  mockServer.collection === null
                    ? t("mock_server.collection_deleted")
                    : mockServer.collection?.title ||
                      t("mock_server.no_collection")
                }}
              </span>
            </div>
          </span>
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
          </div>
          <div class="flex items-center">
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions?.focus?.()"
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
                  @keyup.s="toggleAction?.$el.click()"
                  @keyup.delete="deleteAction?.$el.click()"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    ref="toggleAction"
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
                    ref="deleteAction"
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
    <MockServerEditMockServer
      v-if="showEditModal && selectedMockServer"
      :show="showEditModal"
      :mock-server="selectedMockServer"
      @hide-modal="showEditModal = false"
    />
    <MockServerLogs
      v-if="showLogsModal && selectedMockServer"
      :show="showLogsModal"
      :mock-server-i-d="selectedMockServer.id"
      @close="showLogsModal = false"
    />
    <HoppSmartConfirmModal
      :show="confirmDeleteMockServer"
      :loading-state="loading"
      :title="t('confirm.delete_mock_server')"
      @hide-modal="confirmDeleteMockServer = false"
      @resolve="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { computed, ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { useMockServerStatus } from "~/composables/mockServer"
import { useToast } from "~/composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import type { MockServer } from "~/newstore/mockServers"
import { platform } from "~/platform"

import {
  deleteMockServer as deleteMockServerInStore,
  showCreateMockServerModal$,
  updateMockServer as updateMockServerInStore,
} from "~/newstore/mockServers"

import MockServerCreateMockServer from "~/components/mockServer/CreateMockServer.vue"
import MockServerEditMockServer from "~/components/mockServer/EditMockServer.vue"
import MockServerLogs from "~/components/mockServer/MockServerLogs.vue"
import {
  deleteMockServer as deleteMockServerMutation,
  updateMockServer as updateMockServerMutation,
} from "~/helpers/backend/mutations/MockServer"

// Icons
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconEdit from "~icons/lucide/edit"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconPlay from "~icons/lucide/play"
import IconPlus from "~icons/lucide/plus"
import IconServer from "~icons/lucide/server"
import IconStop from "~icons/lucide/stop-circle"
import IconTrash2 from "~icons/lucide/trash-2"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()
const { mockServers } = useMockServerStatus()
const loading = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showLogsModal = ref(false)
const selectedMockServer = ref<MockServer | null>(null)
const copyIcon = ref(IconCopy)
const tippyActions = ref<TippyComponent | null>(null)
const toggleAction = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)

// Check if user has access (not logged in or no permissions)
const hasNoAccess = computed(() => {
  return !platform.auth.getCurrentUser()
})

const editMockServer = (mockServer: MockServer) => {
  selectedMockServer.value = mockServer
  showEditModal.value = true
}

const openMockServerLogs = (mockServer: MockServer) => {
  selectedMockServer.value = mockServer
  showLogsModal.value = true
}

const toggleMockServer = async (mockServer: MockServer) => {
  loading.value = true

  const newActiveState = !mockServer.isActive

  await pipe(
    updateMockServerMutation(mockServer.id, { isActive: newActiveState }),
    TE.match(
      () => {
        toast.error(t("error.something_went_wrong"))
        loading.value = false
      },
      () => {
        // Show success toast
        toast.success(
          newActiveState
            ? t("mock_server.mock_server_started")
            : t("mock_server.mock_server_stopped")
        )

        // Update local store state
        updateMockServerInStore(mockServer.id, { isActive: newActiveState })

        loading.value = false
      }
    )
  )()
}

const confirmDeleteMockServer = ref(false)
const pendingMockServerToDelete = ref<MockServer | null>(null)

// Open confirm modal for deletion
const deleteMockServer = async (mockServer: MockServer) => {
  pendingMockServerToDelete.value = mockServer
  confirmDeleteMockServer.value = true
}

// Called when the confirm modal is resolved
const confirmDelete = async () => {
  const mockServer = pendingMockServerToDelete.value
  if (!mockServer) return

  loading.value = true
  // hide the modal
  confirmDeleteMockServer.value = false

  await pipe(
    deleteMockServerMutation(mockServer.id),
    TE.match(
      () => {
        toast.error(t("error.something_went_wrong"))
        loading.value = false
        pendingMockServerToDelete.value = null
      },
      (result) => {
        if (result) {
          // Remove from local store
          deleteMockServerInStore(mockServer.id)

          // If the deleted server was selected, clear selection and close logs modal
          if (selectedMockServer.value?.id === mockServer.id) {
            selectedMockServer.value = null
            showLogsModal.value = false
            showEditModal.value = false
          }

          toast.success(t("state.deleted"))
        } else {
          toast.error(t("error.something_went_wrong"))
        }

        loading.value = false
        pendingMockServerToDelete.value = null
      }
    )
  )()
}

const copyToClipboardHandler = async (text: string) => {
  try {
    await copyToClipboard(text)
    copyIcon.value = IconCheck
    // Show which URL was copied
    toast.success(`${t("mock_server.url_copied")}: ${text}`)
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
</script>
