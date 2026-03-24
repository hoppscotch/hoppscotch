<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.edit')"
    @close="hideModal"
  >
    <template #body>
      <div class="space-y-4">
        <HoppSmartInput
          v-model="editingName"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="saveCollection"
        />
        <HoppSmartInput
          v-model="editingDescription"
          placeholder=" "
          :label="t('collection.description')"
          input-styles="floating-input"
        />
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          outline
          @click="saveCollection"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          filled
          outline
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { HoppMCPCollection } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { editMCPCollection } from "~/newstore/collections"

const props = defineProps<{
  show: boolean
  editingCollectionIndex: number | null
  editingCollection: HoppMCPCollection | null
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const t = useI18n()
const toast = useToast()

const editingName = ref<string | null>(null)
const editingDescription = ref<string | null>(null)

watch(
  () => props.editingCollection,
  (collection) => {
    editingName.value = collection?.name ?? null
    editingDescription.value = collection?.description ?? null
  },
  { immediate: true }
)

const saveCollection = () => {
  if (!editingName.value?.trim()) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  if (props.editingCollectionIndex === null) {
    toast.error(`${t("error.something_went_wrong")}`)
    return
  }

  editMCPCollection(props.editingCollectionIndex, {
    name: editingName.value,
    description: editingDescription.value?.trim() || null,
  })

  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
