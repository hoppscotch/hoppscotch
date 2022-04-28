<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${$t('folder.edit')}`"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlEditFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="editFolder"
        />
        <label for="selectLabelGqlEditFolder">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${$t('action.save')}`"
          @click.native="editFolder"
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
import { HoppCollection, HoppGQLRequest } from "@hoppscotch/data"
import { ref, watch } from "@nuxtjs/composition-api"
import { editGraphqlFolder } from "~/newstore/collections"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  folder: HoppCollection<HoppGQLRequest>
  folderPath?: string
  editingFolderName?: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (show && props.editingFolderName) {
      name.value = props.editingFolderName
    }
  }
)

const hideModal = () => {
  emit("hide-modal")
}

const editFolder = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }
  if (!props.folderPath) {
    console.error("No folder path")
    toast.error(`${t("error.something_went_wrong")}`)
    return
  }

  editGraphqlFolder(props.folderPath, {
    ...props.folder,
    name: name.value,
  })

  hideModal()
}
</script>
