<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.new')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-4">
        <HoppSmartInput
          v-model="collectionName"
          :placeholder="t('collection.name')"
          :label="t('collection.name')"
          input-styles="floating-input"
          @submit="addCollection"
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
          @click="addCollection"
        />
        <HoppButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { addMCPCollection } from "~/newstore/collections"
import { makeCollection } from "@hoppscotch/data"

const t = useI18n()
const toast = useToast()

const emit = defineEmits<{
  "hide-modal": []
}>()

const show = ref(true)
const loading = ref(false)
const collectionName = ref("")
const collectionDescription = ref("")

const hideModal = () => {
  show.value = false
  emit("hide-modal")
}

const addCollection = () => {
  if (!collectionName.value.trim()) {
    toast.error(t("collection.name_length_insufficient"))
    return
  }

  loading.value = true

  try {
    const newCollection = makeCollection({
      name: collectionName.value,
      description: collectionDescription.value || null,
      folders: [],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      headers: [],
      variables: [],
    })

    addMCPCollection(newCollection)
    toast.success(t("collection.created"))
    hideModal()
  } catch (_error) {
    toast.error(t("error.something_went_wrong"))
  } finally {
    loading.value = false
  }
}
</script>
