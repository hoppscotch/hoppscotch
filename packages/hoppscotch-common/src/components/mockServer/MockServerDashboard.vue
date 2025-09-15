<template>
  <div class="flex flex-col space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-secondary">
          {{ t("mockServer.dashboard.title") }}
        </h3>
        <p class="text-sm text-secondaryLight">
          {{ t("mockServer.dashboard.subtitle") }}
        </p>
      </div>
      <HoppButtonPrimary
        :label="t('mockServer.dashboard.create_button')"
        :icon="IconPlus"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Mock Servers List -->
    <div v-if="mockServers.length > 0" class="space-y-4">
      <div
        v-for="mockServer in mockServers"
        :key="mockServer.id"
        class="border border-divider rounded-lg p-4"
      >
        <!-- Mock Server Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <div class="flex-1">
              <h4 class="font-medium text-secondary">{{ mockServer.name }}</h4>
              <p class="text-sm text-secondaryLight">
                {{ t("mockServer.dashboard.collection") }}:
                {{ getCollectionName(mockServer.collectionID) }}
              </p>
            </div>
            <!-- Status Badge -->
            <div class="flex items-center space-x-2">
              <div
                :class="[
                  'w-2 h-2 rounded-full',
                  mockServer.isActive ? 'bg-green-500' : 'bg-red-500',
                ]"
              ></div>
              <span class="text-sm text-secondaryLight">
                {{
                  mockServer.isActive
                    ? t("mockServer.dashboard.active")
                    : t("mockServer.dashboard.inactive")
                }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2">
            <HoppButtonSecondary
              :icon="IconCopy"
              size="sm"
              @click="copyMockServerUrl(mockServer)"
            />
            <HoppButtonSecondary
              :icon="IconSettings"
              size="sm"
              @click="editMockServer(mockServer)"
            />
            <HoppButtonSecondary
              :icon="IconTrash"
              size="sm"
              color="red"
              @click="deleteMockServerConfirm(mockServer)"
            />
          </div>
        </div>

        <!-- Mock Server URL -->
        <div class="bg-primaryLight rounded-md p-3 mb-3">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <label class="text-xs text-secondaryLight">
                {{ t("mockServer.dashboard.mock_url") }}
              </label>
              <p class="font-mono text-sm text-secondary break-all">
                {{ getMockServerUrl(mockServer) }}
              </p>
            </div>
            <HoppButtonSecondary
              :icon="IconCopy"
              size="sm"
              @click="copyMockServerUrl(mockServer)"
            />
          </div>
        </div>

        <!-- Collection Info -->
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center space-x-4">
            <span class="text-secondaryLight">
              {{ t("mockServer.dashboard.endpoints") }}:
              {{ getEndpointCount(mockServer.collectionID) }}
            </span>
            <span class="text-secondaryLight">
              {{ t("mockServer.dashboard.created") }}:
              {{ formatDate(mockServer.createdOn) }}
            </span>
          </div>
          <HoppSmartAnchor
            :to="`/collections/${mockServer.collectionID}`"
            class="text-accent hover:text-accentDark"
          >
            {{ t("mockServer.dashboard.view_collection") }}
          </HoppSmartAnchor>
        </div>

        <!-- Documentation section -->
        <div class="mt-4 pt-4 border-t border-divider">
          <details class="group">
            <summary class="cursor-pointer text-sm font-medium text-secondary">
              {{ t("mockServer.dashboard.documentation") }}
            </summary>
            <div class="mt-3 text-sm text-secondaryLight space-y-2">
              <p>{{ t("mockServer.dashboard.doc_description") }}</p>
              <div class="bg-primaryLight rounded p-3 font-mono text-xs">
                <p>curl {{ getMockServerUrl(mockServer) }}/your-endpoint</p>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="mb-4">
        <HoppSmartPlaceholder
          :src="`/images/states/${colorMode.value}/add_files.svg`"
          :alt="t('mockServer.dashboard.empty_title')"
          class="w-32 h-32 mx-auto"
        />
      </div>
      <h3 class="text-lg font-medium text-secondary mb-2">
        {{ t("mockServer.dashboard.empty_title") }}
      </h3>
      <p class="text-secondaryLight mb-4 max-w-md mx-auto">
        {{ t("mockServer.dashboard.empty_description") }}
      </p>
      <HoppButtonPrimary
        :label="t('mockServer.dashboard.create_first')"
        :icon="IconPlus"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Create Modal -->
    <CreateMockServer
      :show="showCreateModal"
      @hide="showCreateModal = false"
      @created="onMockServerCreated"
    />

    <!-- Edit Modal -->
    <EditMockServer
      v-if="editingMockServer"
      :show="showEditModal"
      :mock-server="editingMockServer"
      @hide="showEditModal = false"
      @updated="onMockServerUpdated"
    />

    <!-- Delete Confirmation -->
    <HoppSmartConfirmModal
      :show="showDeleteModal"
      :title="t('mockServer.dashboard.delete_title')"
      :loading="deletingMockServer"
      @hide="showDeleteModal = false"
      @resolve="deleteMockServer"
    >
      <template #body>
        <p>{{ t("mockServer.dashboard.delete_description") }}</p>
        <p class="font-semibold">{{ deletingMockServerName }}</p>
      </template>
    </HoppSmartConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { restCollections$ } from "~/newstore/collections"
import { useReadonlyStream } from "@composables/stream"
import CreateMockServer from "./CreateMockServer.vue"
import EditMockServer from "./EditMockServer.vue"
import IconPlus from "~icons/lucide/plus"
import IconCopy from "~icons/lucide/copy"
import IconSettings from "~icons/lucide/settings"
import IconTrash from "~icons/lucide/trash"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

// Mock data - replace with actual store
const mockServers = ref([
  {
    id: "1",
    name: "My API Mock",
    subdomain: "mock-abc123",
    userUid: "user1",
    collectionID: "collection1",
    isActive: true,
    createdOn: new Date(),
    updatedOn: new Date(),
  },
])

useReadonlyStream(restCollections$, [])

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingMockServer = ref(null)
const deletingMockServer = ref(false)
const deletingMockServerName = ref("")
const deletingMockServerId = ref("")

// Computed
const getMockServerUrl = (mockServer: any) => {
  // TODO: Get from environment config
  const baseUrl = "https://mock.hoppscotch.io"
  return `${baseUrl}/${mockServer.subdomain}`
}

// Methods
function getCollectionName(collectionID: string) {
  // TODO: Find collection name from collections store
  return "My Collection"
}

function getEndpointCount(collectionID: string) {
  // TODO: Count endpoints in collection
  return 5
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat().format(new Date(date))
}

async function copyMockServerUrl(mockServer: any) {
  const url = getMockServerUrl(mockServer)
  await copyToClipboard(url)
  toast.success(t("mockServer.dashboard.url_copied"))
}

function editMockServer(mockServer: any) {
  editingMockServer.value = mockServer
  showEditModal.value = true
}

function deleteMockServerConfirm(mockServer: any) {
  deletingMockServerName.value = mockServer.name
  deletingMockServerId.value = mockServer.id
  showDeleteModal.value = true
}

async function deleteMockServer() {
  try {
    deletingMockServer.value = true
    // TODO: Call GraphQL mutation to delete mock server
    mockServers.value = mockServers.value.filter(
      (server) => server.id !== deletingMockServerId.value
    )
    toast.success(t("mockServer.dashboard.delete_success"))
    showDeleteModal.value = false
  } catch (error) {
    console.error("Error deleting mock server:", error)
    toast.error(t("mockServer.dashboard.delete_error"))
  } finally {
    deletingMockServer.value = false
  }
}

function onMockServerCreated(mockServer: any) {
  mockServers.value.push(mockServer)
}

function onMockServerUpdated(updatedMockServer: any) {
  const index = mockServers.value.findIndex(
    (server) => server.id === updatedMockServer.id
  )
  if (index !== -1) {
    mockServers.value[index] = updatedMockServer
  }
}
</script>
