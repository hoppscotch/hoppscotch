<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('folder.new')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelAddFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addFolder"
        />
        <label for="selectLabelAddFolder">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="addFolder"
        />
        <ButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { TeamCollection } from "~/helpers/teams/TeamCollection"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  folder: HoppCollection<HoppRESTRequest> | TeamCollection | undefined
  folderPath: string | undefined
  collectionIndex: number | undefined
  loadingState: boolean
}>()

const emit = defineEmits<{
  (e: "add-folder", payload: any): void
  (e: "hide-modal"): void
}>()

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (!show) {
      name.value = ""
    }
  }
)

const addFolder = () => {
  if (name.value === "") {
    toast.error(t("folder.invalid_name"))
    return
  }

  emit("add-folder", {
    name: name.value,
    folder: props.folder,
    path: props.folderPath || `${props.collectionIndex}`,
  })
}

const hideModal = () => {
  name.value = ""
  emit("hide-modal")
}
</script>
