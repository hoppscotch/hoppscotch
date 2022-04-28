<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${$t('collection.edit')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlEdit"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="saveCollection"
        />
        <label for="selectLabelGqlEdit">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${$t('action.save')}`"
          @click.native="saveCollection"
        />
        <ButtonSecondary
          :label="`${$t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
import { HoppCollection, HoppGQLRequest } from "~/../hoppscotch-data/dist"
import { editGraphqlCollection } from "~/newstore/collections"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  editingCollection: HoppCollection<HoppGQLRequest>
  editingCollectionIndex?: number
  editingCollectionName?: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref("")
watch(
  () => props.show,
  (show) => {
    if (show && props.editingCollectionName) {
      name.value = props.editingCollectionName
    }
  }
)

const hideModal = () => {
  emit("hide-modal")
}

const saveCollection = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }
  if (props.editingCollectionIndex === undefined) {
    console.error("No collection index")
    toast.error(`${t("error.something_went_wrong")}`)
    return
  }

  const collectionUpdated = {
    ...props.editingCollection,
    name: name.value,
  }
  editGraphqlCollection(props.editingCollectionIndex, collectionUpdated)

  hideModal()
}
</script>
