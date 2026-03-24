<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.new')"
    @close="hideModal"
  >
    <template #body>
      <div class="space-y-4">
        <HoppSmartInput
          v-model="name"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="addCollection"
        />
        <HoppSmartInput
          v-model="description"
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
          @click="addCollection"
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
import { ref } from "vue"
import { makeMCPCollection } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { addMCPCollection } from "~/newstore/collections"

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const t = useI18n()
const toast = useToast()

const name = ref<string | null>(null)
const description = ref<string | null>(null)

const addCollection = () => {
  if (!name.value?.trim()) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  addMCPCollection(
    makeMCPCollection({
      name: name.value,
      description: description.value?.trim() || null,
      requests: [],
    })
  )

  hideModal()
}

const hideModal = () => {
  name.value = null
  description.value = null
  emit("hide-modal")
}
</script>
