<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mockServer.create_modal.title')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-4">
        <!-- Mock Server Name -->
        <div class="flex flex-col">
          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.create_modal.name_label") }}
          </label>
          <input
            v-model="mockServerName"
            type="text"
            class="input"
            :placeholder="t('mockServer.create_modal.name_placeholder')"
            @keyup.enter="createMockServer"
          />
        </div>

        <!-- Collection Source -->
        <div class="flex flex-col">
          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.create_modal.collection_source_label") }}
          </label>
          <div class="flex space-x-4">
            <label class="flex items-center space-x-2">
              <input
                v-model="collectionSource"
                type="radio"
                value="existing"
                class="radio"
              />
              <span>{{
                t("mockServer.create_modal.existing_collection")
              }}</span>
            </label>
            <label class="flex items-center space-x-2">
              <input
                v-model="collectionSource"
                type="radio"
                value="new"
                class="radio"
              />
              <span>{{ t("mockServer.create_modal.new_collection") }}</span>
            </label>
          </div>
        </div>

        <!-- Existing Collection Dropdown -->
        <div v-if="collectionSource === 'existing'" class="flex flex-col">
          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.create_modal.select_collection_label") }}
          </label>
          <HoppSmartSelect
            v-model="selectedCollectionID"
            :placeholder="
              t('mockServer.create_modal.select_collection_placeholder')
            "
          >
            <HoppSmartSelectOption
              v-for="collection in restCollections"
              :key="collection.id"
              :value="collection.id"
            >
              {{ collection.name }}
            </HoppSmartSelectOption>
          </HoppSmartSelect>
        </div>

        <!-- New Collection Request Configuration -->
        <div v-if="collectionSource === 'new'" class="flex flex-col">
          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.create_modal.collection_name_label") }}
          </label>
          <input
            v-model="newCollectionName"
            type="text"
            class="input mb-4"
            :placeholder="
              t('mockServer.create_modal.collection_name_placeholder')
            "
          />

          <label class="text-secondaryLight mb-2">
            {{ t("mockServer.create_modal.request_config_label") }}
          </label>

          <div class="space-y-3">
            <div
              v-for="(request, index) in mockRequests"
              :key="index"
              class="flex items-center space-x-2 p-3 border border-divider rounded"
            >
              <!-- Method -->
              <HoppSmartSelect
                v-model="request.method"
                class="flex-shrink-0 w-24"
              >
                <HoppSmartSelectOption value="GET">GET</HoppSmartSelectOption>
                <HoppSmartSelectOption value="POST">POST</HoppSmartSelectOption>
                <HoppSmartSelectOption value="PUT">PUT</HoppSmartSelectOption>
                <HoppSmartSelectOption value="DELETE"
                  >DELETE</HoppSmartSelectOption
                >
                <HoppSmartSelectOption value="PATCH"
                  >PATCH</HoppSmartSelectOption
                >
              </HoppSmartSelect>

              <!-- Path -->
              <input
                v-model="request.path"
                type="text"
                class="input flex-1"
                placeholder="{{url}}/path"
              />

              <!-- Status Code -->
              <input
                v-model.number="request.statusCode"
                type="number"
                class="input w-20"
                placeholder="200"
                min="100"
                max="599"
              />

              <!-- Response Body -->
              <input
                v-model="request.responseBody"
                type="text"
                class="input flex-1"
                placeholder="Response body (JSON)"
              />

              <!-- Remove Button -->
              <HoppButtonSecondary
                v-if="mockRequests.length > 1"
                :icon="IconTrash"
                color="red"
                @click="removeMockRequest(index)"
              />
            </div>

            <!-- Add Request Button -->
            <HoppButtonSecondary
              :label="t('mockServer.create_modal.add_request')"
              :icon="IconPlus"
              @click="addMockRequest"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('mockServer.create_modal.create_button')"
          :loading="loading"
          @click="createMockServer"
        />
        <HoppButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { restCollections$ } from "~/newstore/collections"
import { useReadonlyStream } from "@composables/stream"
import { HoppCollection } from "@hoppscotch/data"
import IconTrash from "~icons/lucide/trash"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()
const toast = useToast()

const restCollections = useReadonlyStream(restCollections$, [])

// Props and emits
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  hide: []
  created: [mockServer: any]
}>()

// Form state
const mockServerName = ref("")
const collectionSource = ref<"existing" | "new">("existing")
const selectedCollectionID = ref("")
const newCollectionName = ref("")
const loading = ref(false)

// Mock requests for new collection
const mockRequests = ref([
  {
    method: "GET",
    path: "/",
    statusCode: 200,
    responseBody: '{"message": "Hello World"}',
  },
])

// Computed
const restCollectionsList = computed(() => {
  const collectionsArray: Array<{ id: string; name: string }> = []

  function addCollections(collections: HoppCollection[], prefix = "") {
    collections.forEach((collection, index) => {
      collectionsArray.push({
        id: collection.id || `${index}`,
        name: `${prefix}${collection.name}`,
      })

      if (collection.folders && collection.folders.length > 0) {
        addCollections(collection.folders, `${prefix}${collection.name}/`)
      }
    })
  }

  addCollections(restCollections.value)
  return collectionsArray
})

// Methods
function hideModal() {
  emit("hide")
  resetForm()
}

function resetForm() {
  mockServerName.value = ""
  collectionSource.value = "existing"
  selectedCollectionID.value = ""
  newCollectionName.value = ""
  mockRequests.value = [
    {
      method: "GET",
      path: "/",
      statusCode: 200,
      responseBody: '{"message": "Hello World"}',
    },
  ]
}

function addMockRequest() {
  mockRequests.value.push({
    method: "GET",
    path: "/new-endpoint",
    statusCode: 200,
    responseBody: '{"message": "New endpoint"}',
  })
}

function removeMockRequest(index: number) {
  mockRequests.value.splice(index, 1)
}

async function createMockServer() {
  if (!mockServerName.value.trim()) {
    toast.error(t("mockServer.create_modal.name_required"))
    return
  }

  if (collectionSource.value === "existing" && !selectedCollectionID.value) {
    toast.error(t("mockServer.create_modal.collection_required"))
    return
  }

  if (collectionSource.value === "new" && !newCollectionName.value.trim()) {
    toast.error(t("mockServer.create_modal.collection_name_required"))
    return
  }

  loading.value = true

  try {
    let collectionID = selectedCollectionID.value

    // Create new collection if needed
    if (collectionSource.value === "new") {
      // TODO: Implement collection creation with mock requests
      // For now, use the first available collection
      if (restCollectionsList.value.length > 0) {
        collectionID = restCollectionsList.value[0].id
      } else {
        toast.error(t("mockServer.create_modal.no_collections"))
        return
      }
    }

    // TODO: Call GraphQL mutation to create mock server
    const mockServer = {
      id: Math.random().toString(36).substring(2),
      name: mockServerName.value,
      subdomain: `mock-${Math.random().toString(36).substring(2, 8)}`,
      collectionID,
      isActive: true,
      createdOn: new Date(),
      updatedOn: new Date(),
    }

    emit("created", mockServer)
    toast.success(t("mockServer.create_modal.success"))
    hideModal()
  } catch (error) {
    console.error("Error creating mock server:", error)
    toast.error(t("mockServer.create_modal.error"))
  } finally {
    loading.value = false
  }
}
</script>
