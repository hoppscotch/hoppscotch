<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.edit')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-4">
        <HoppSmartInput
          v-model="collectionName"
          :placeholder="t('collection.name')"
          :label="t('collection.name')"
          input-styles="floating-input"
          @submit="editCollection"
        />
        <HoppSmartInput
          v-model="collectionDescription"
          :placeholder="t('collection.description')"
          :label="t('collection.description')"
          input-styles="floating-input"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loading"
          @click="editCollection"
        />
        <HoppButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { editMCPCollection } from "~/newstore/collections"
import type { HoppCollection } from "@hoppscotch/data"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  editingCollection: HoppCollection | null
  editingCollectionIndex: number | null
}>()

const emit = defineEmits<{
  "hide-modal": []
}>()

const show = ref(true)
const loading = ref(false)
const collectionName = ref("")
const collectionDescription = ref("")

watch(
  () => props.editingCollection,
  (collection) => {
    if (collection) {
      collectionName.value = collection.name
      collectionDescription.value = collection.description || ""
    }
  },
  { immediate: true }
)

const hideModal = () => {
  show.value = false
  emit("hide-modal")
}

const editCollection = () => {
  if (!collectionName.value.trim()) {
    toast.error(t("collection.name_length_insufficient"))
    return
  }

  if (props.editingCollectionIndex === null) {
    toast.error(t("error.something_went_wrong"))
    return
  }

  loading.value = true

  try {
    editMCPCollection(props.editingCollectionIndex, {
      name: collectionName.value,
      description: collectionDescription.value || null,
    })
    toast.success(t("collection.saved"))
    hideModal()
  } catch (_error) {
    toast.error(t("error.something_went_wrong"))
  } finally {
    loading.value = false
  }
}
</script>
