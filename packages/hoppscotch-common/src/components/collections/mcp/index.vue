<template>
  <div :class="{ 'rounded border border-divider': saveRequest }">
    <div
      class="sticky z-10 flex flex-shrink-0 flex-col overflow-x-auto rounded-t bg-primary"
      :style="
        saveRequest ? 'top: calc(-1 * var(--line-height-body))' : 'top: 0'
      "
    >
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        :placeholder="t('action.search')"
        class="flex w-full bg-transparent px-4 py-2 h-8"
      />
      <div
        class="flex flex-1 flex-shrink-0 justify-between border-y border-dividerLight bg-primary"
      >
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('action.new')"
          class="!rounded-none"
          @click="displayModalAdd(true)"
        />
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/documentation/features/collections"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <div
        v-for="(collection, index) in filteredCollections"
        :key="`collection-${collection.id || collection.name}-${index}`"
        class="border-b border-dividerLight p-4"
      >
        <div class="flex items-center justify-between">
          <span class="font-semibold text-secondaryDark">{{
            collection.name
          }}</span>
          <div class="flex space-x-2">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.edit')"
              :icon="IconEdit"
              @click="editCollection(collection)"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.delete')"
              :icon="IconTrash"
              color="red"
              @click="removeCollection(collection)"
            />
          </div>
        </div>
        <div
          v-if="collection.description"
          class="text-sm text-secondaryLight mt-1"
        >
          {{ collection.description }}
        </div>
        <div class="text-xs text-secondaryLight mt-2">
          {{ collection.requests?.length || 0 }}
          {{ t("collection.request", collection.requests?.length || 0) }}
        </div>
      </div>
    </div>
    <HoppSmartPlaceholder
      v-if="collections.length === 0"
      :src="`/images/states/${colorMode.value}/pack.svg`"
      :alt="`${t('empty.collections')}`"
      :text="t('empty.collections')"
    >
      <template #body>
        <div class="flex flex-col items-center space-y-4">
          <span class="text-center text-secondaryLight">
            {{ t("collection.import_or_create") }}
          </span>
          <HoppButtonPrimary
            :label="t('add.new')"
            filled
            outline
            :icon="IconPlus"
            @click="displayModalAdd(true)"
          />
        </div>
      </template>
    </HoppSmartPlaceholder>
    <HoppSmartPlaceholder
      v-if="!(filteredCollections.length !== 0 || collections.length === 0)"
      :text="`${t('state.nothing_found')} \&quot;${filterText}\&quot;`"
    />
    <CollectionsMcpAdd
      v-if="showModalAdd"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsMcpEdit
      v-if="showModalEdit"
      :editing-collection="editingCollection"
      :editing-collection-index="editingCollectionIndex"
      @hide-modal="displayModalEdit(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconEdit from "~icons/lucide/edit"
import IconTrash from "~icons/lucide/trash"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { mcpCollections$, removeMCPCollection } from "~/newstore/collections"
import CollectionsMcpAdd from "./Add.vue"
import CollectionsMcpEdit from "./Edit.vue"
import type { HoppCollection } from "@hoppscotch/data"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

defineProps<{
  saveRequest?: boolean
}>()

const collections = useStream(mcpCollections$, [], () => {})

const filterText = ref("")
const showModalAdd = ref(false)
const showModalEdit = ref(false)
const editingCollection = ref<HoppCollection | null>(null)
const editingCollectionIndex = ref<number | null>(null)

const filteredCollections = computed(() => {
  if (!filterText.value) return collections.value

  const query = filterText.value.toLowerCase()
  return collections.value.filter(
    (collection) =>
      collection.name.toLowerCase().includes(query) ||
      collection.description?.toLowerCase().includes(query)
  )
})

const displayModalAdd = (show: boolean) => {
  showModalAdd.value = show
}

const displayModalEdit = (show: boolean) => {
  showModalEdit.value = show
  if (!show) {
    editingCollection.value = null
    editingCollectionIndex.value = null
  }
}

const editCollection = (collection: HoppCollection) => {
  // Find actual index in full collections array
  const actualIndex = collections.value.findIndex((c) => c === collection)
  if (actualIndex === -1) return

  editingCollection.value = collection
  editingCollectionIndex.value = actualIndex
  displayModalEdit(true)
}

const removeCollection = (collection: HoppCollection) => {
  // Find actual index in full collections array
  const actualIndex = collections.value.findIndex((c) => c === collection)
  if (actualIndex === -1) return

  removeMCPCollection(actualIndex)
  toast.success(t("state.deleted"))
}
</script>
