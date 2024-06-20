<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('collection.new')}`"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        input-styles="floating-input"
        :label="t('action.label')"
        @submit="addNewCollection"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="addNewCollection"
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
import { ref } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { makeCollection } from "@hoppscotch/data"
import { addGraphqlCollection } from "~/newstore/collections"
import { platform } from "~/platform"

const t = useI18n()
const toast = useToast()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref<string | null>(null)

const addNewCollection = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  addGraphqlCollection(
    makeCollection({
      name: name.value,
      folders: [],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
    })
  )

  hideModal()

  platform.analytics?.logEvent({
    type: "HOPP_CREATE_COLLECTION",
    isRootCollection: true,
    platform: "gql",
    workspaceType: "personal",
  })
}

const hideModal = () => {
  name.value = null
  emit("hide-modal")
}
</script>
