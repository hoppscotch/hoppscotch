<template>
  <div class="flex flex-col flex-1">
    <!-- Header -->
    <div
      class="sticky z-10 flex flex-1 justify-between border-b border-dividerLight bg-primary top-0"
    >
      <HoppButtonSecondary
        v-if="!hasNoAccess"
        :icon="IconPlus"
        :label="t('mock_server.create_mock_server')"
        class="!rounded-none"
        @click="showCreateModal = true"
      />
      <HoppButtonSecondary
        v-else
        v-tippy="{ theme: 'tooltip' }"
        disabled
        class="!rounded-none"
        :icon="IconPlus"
        :title="t('team.no_access')"
        :label="t('mock_server.create_mock_server')"
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

    <!-- Mock Servers List -->
    <div class="flex flex-col flex-1">
      <div v-if="loading" class="flex flex-col items-center justify-center flex-1 p-4">
        <HoppSmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t('state.loading') }}</span>
      </div>

      <div v-else-if="mockServers.length === 0" class="flex flex-col items-center justify-center flex-1 p-4">
        <img
          :src="`/images/states/${colorMode.value}/add_files.svg`"
          :alt="`${t('empty.mock_servers')}`"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4 opacity-75"
        />
        <span class="pb-4 text-center text-secondaryLight">
          {{ t('empty.mock_servers') }}
        </span>
        <HoppButtonSecondary
          v-if="!hasNoAccess"
          :label="t('mock_server.create_mock_server')"
          :icon="IconPlus"
          filled
          @click="showCreateModal = true"
        />
      </div>

      <div v-else class="divide-y divide-dividerLight">
        <div
          v-for="mockServer in mockServers"
          :key="mockServer.id"
          class="flex items-center justify-between p-4 hover:bg-primaryLight group"
        >
          <div class="flex items-center flex-1 min-w-0">
            <!-- Status Indicator -->
            <div class="flex items-center mr-3">
              <component
                :is="IconServer"
                class="w-4 h-4"
                :class="{
                  'text-green-500': mockServer.isActive,
                  'text-secondaryLight': !mockServer.isActive
                }"
              />
            </div>

            <!-- Mock Server Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <h3 class="font-semibold text-secondaryDark truncate">
                  {{ mockServer.name }}
                </h3>
                <span
                  class="px-2 py-1 text-xs rounded-full"
                  :class="{
                    'bg-green-100 text-green-800': mockServer.isActive,
                    'bg-gray-100 text-gray-600': !mockServer.isActive
                  }"
                >
                  {{ mockServer.isActive ? t('mock_server.active') : t('mock_server.inactive') }}
                </span>
              </div>
              <div class="text-sm text-secondaryLight truncate">
                {{ mockServer.collection?.title || t('mock_server.no_collection') }}
              </div>
              <div class="text-xs text-secondaryLight font-mono truncate">
                {{ mockServer.serverUrlDomainBased || mockServer.serverUrlPathBased }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <HoppButtonSecondary
              v-if="mockServer.serverUrlDomainBased || mockServer.serverUrlPathBased"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.copy')"
              :icon="copyIcon"
              @click="copyToClipboard(mockServer.serverUrlDomainBased || mockServer.serverUrlPathBased || '')"
            />
            <HoppButtonSecondary
              v-if="!hasNoAccess"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.edit')"
              :icon="IconEdit"
              @click="editMockServer(mockServer)"
            />
            <HoppButtonSecondary
              v-if="!hasNoAccess"
              v-tippy="{ theme: 'tooltip' }"
              :title="mockServer.isActive ? t('mock_server.stop_server') : t('mock_server.start_server')"
              :icon="mockServer.isActive ? IconStop : IconPlay"
              @click="toggleMockServer(mockServer)"
            />
            <HoppButtonSecondary
              v-if="!hasNoAccess"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.delete')"
              :icon="IconTrash2"
              @click="deleteMockServer(mockServer)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Create Mock Server Modal -->
    <MockServerCreateMockServer
      v-if="showCreateModal"
      :show="showCreateModal"
      @hide-modal="showCreateModal = false"
    />

    <!-- Edit Mock Server Modal -->
    <MockServerEditMockServer
      v-if="showEditModal && selectedMockServer"
      :show="showEditModal"
      :mock-server="selectedMockServer"
      @hide-modal="showEditModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useMockServerStatus } from "~/composables/mockServer"
import { useToast } from "~/composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { platform } from "~/platform"
import type { MockServer } from "~/newstore/mockServers"
import { loadMockServers } from "~/newstore/mockServers"

// Icons
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconServer from "~icons/lucide/server"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPlay from "~icons/lucide/play"
import IconStop from "~icons/lucide/stop"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()
const { mockServers } = useMockServerStatus()

const loading = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedMockServer = ref<MockServer | null>(null)
const copyIcon = ref(IconCopy)

// Check if user has access (not logged in or no permissions)
const hasNoAccess = computed(() => {
  return !platform.auth.getCurrentUser()
})

const editMockServer = (mockServer: MockServer) => {
  selectedMockServer.value = mockServer
  showEditModal.value = true
}

const toggleMockServer = async (mockServer: MockServer) => {
  try {
    // TODO: Implement mock server start/stop functionality
    // This would typically call a backend API to start/stop the mock server
    toast.success(
      mockServer.isActive 
        ? t('mock_server.mock_server_stopped')
        : t('mock_server.mock_server_started')
    )
  } catch (error) {
    toast.error(t('error.something_went_wrong'))
  }
}

const deleteMockServer = async (mockServer: MockServer) => {
  if (confirm(t('confirm.delete_mock_server'))) {
    try {
      // TODO: Implement mock server deletion
      toast.success(t('state.deleted'))
    } catch (error) {
      toast.error(t('error.something_went_wrong'))
    }
  }
}

const copyToClipboardHandler = async (text: string) => {
  try {
    await copyToClipboard(text)
    copyIcon.value = IconCheck
    toast.success(t('state.copied_to_clipboard'))
    setTimeout(() => {
      copyIcon.value = IconCopy
    }, 1000)
  } catch (error) {
    toast.error(t('error.copy_failed'))
  }
}

// Load mock servers on component mount
onMounted(async () => {
  if (platform.auth.getCurrentUser()) {
    loading.value = true
    try {
      await loadMockServers()
    } catch (error) {
      console.error('Failed to load mock servers:', error)
    } finally {
      loading.value = false
    }
  }
})
</script>