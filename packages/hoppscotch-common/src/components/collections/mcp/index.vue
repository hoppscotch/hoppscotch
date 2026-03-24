<template>
  <div class="flex flex-col">
    <div
      class="sticky top-0 z-10 flex flex-col overflow-x-auto rounded-t bg-primary"
    >
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        :placeholder="t('action.search')"
        class="flex h-8 w-full bg-transparent px-4 py-2"
      />
      <div class="flex justify-between border-y border-dividerLight bg-primary">
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('action.new')"
          class="!rounded-none"
          @click="showAddModal = true"
        />
      </div>
    </div>

    <div v-if="filteredCollections.length > 0" class="flex flex-col">
      <div
        v-for="(collection, index) in filteredCollections"
        :key="collection._ref_id ?? index"
        class="group border-b border-dividerLight px-4 py-3"
      >
        <div class="flex items-start justify-between gap-3">
          <button
            class="min-w-0 flex-1 text-left"
            type="button"
            @click="handleCollectionClick(index)"
          >
            <p class="truncate font-semibold text-secondaryDark">
              {{ collection.name }}
            </p>
            <p
              v-if="collection.description"
              class="mt-1 text-sm text-secondaryLight"
            >
              {{ collection.description }}
            </p>
            <p class="mt-2 text-tiny text-secondaryLight">
              {{ collection.requests.length }}
              {{ t("mcp.saved_requests") }}
            </p>
          </button>

          <div class="flex items-center gap-1">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.edit')"
              :icon="IconPencil"
              class="hidden group-hover:inline-flex"
              @click="openEditModal(index)"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.remove')"
              :icon="IconTrash"
              color="red"
              class="hidden group-hover:inline-flex"
              @click="removeMCPCollection(index)"
            />
          </div>
        </div>
      </div>
    </div>

    <HoppSmartPlaceholder
      v-else-if="collections.length === 0"
      :src="`/images/states/${colorMode.value}/pack.svg`"
      :alt="`${t('empty.collections')}`"
      :text="t('empty.collections')"
    />
    <HoppSmartPlaceholder
      v-else
      :text="`${t('state.nothing_found')} ‟${filterText}”`"
    >
      <template #icon>
        <icon-lucide-search class="svg-icons opacity-75" />
      </template>
    </HoppSmartPlaceholder>

    <CollectionsMcpAdd
      :show="showAddModal"
      @hide-modal="showAddModal = false"
    />
    <CollectionsMcpEdit
      :show="showEditModal"
      :editing-collection-index="editingCollectionIndex"
      :editing-collection="editingCollection"
      @hide-modal="hideEditModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconPlus from "~icons/lucide/plus"
import IconPencil from "~icons/lucide/pencil"
import IconTrash from "~icons/lucide/trash"
import { HoppMCPCollection } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { mcpCollections$, removeMCPCollection } from "~/newstore/collections"

const props = withDefaults(
  defineProps<{
    saveRequest?: boolean
  }>(),
  {
    saveRequest: false,
  }
)

const emit = defineEmits<{
  (e: "select-collection", collectionIndex: number): void
}>()

const t = useI18n()
const colorMode = useColorMode()

const collections = useReadonlyStream(mcpCollections$, [], "deep")

const filterText = ref("")
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingCollectionIndex = ref<number | null>(null)

const filteredCollections = computed(() => {
  if (!filterText.value.trim()) {
    return collections.value
  }

  const query = filterText.value.toLowerCase()

  return collections.value.filter(
    (collection) =>
      collection.name.toLowerCase().includes(query) ||
      (collection.description?.toLowerCase().includes(query) ?? false)
  )
})

const editingCollection = computed<HoppMCPCollection | null>(() => {
  if (editingCollectionIndex.value === null) {
    return null
  }

  return collections.value[editingCollectionIndex.value] ?? null
})

const openEditModal = (index: number) => {
  editingCollectionIndex.value = index
  showEditModal.value = true
}

const hideEditModal = () => {
  showEditModal.value = false
  editingCollectionIndex.value = null
}

const handleCollectionClick = (index: number) => {
  if (!props.saveRequest) {
    return
  }

  emit("select-collection", index)
}
</script>
