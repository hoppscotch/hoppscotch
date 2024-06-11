<template>
  <HoppSmartModal dialog :title="`${t('collection.edit')}`" @close="hideModal">
    <template #body>
      <HoppSmartInput
        v-model="editingName"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="saveCollection"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="saveCollection"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { onMounted, ref } from "vue"

const props = defineProps<{
  editingCollectionName: string
}>()

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
}>()

const t = useI18n()
const toast = useToast()

const editingName = ref<string | null>(null)

onMounted(() => {
  editingName.value = props.editingCollectionName
})

const saveCollection = () => {
  if (!editingName.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  emit("submit", editingName.value)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
