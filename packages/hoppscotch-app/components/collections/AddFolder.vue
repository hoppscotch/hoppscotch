<template>
  <SmartModal
    v-if="show"
    dialog
    :title="$t('folder.new')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col px-2">
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
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="$t('action.save')"
          :loading="loadingState"
          @click.native="addFolder"
        />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { ref } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  folder?: HoppCollection<HoppRESTRequest>
  folderPath?: string
  loadingState: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (
    e: "add-folder",
    v: {
      name: string
      folder: HoppCollection<HoppRESTRequest> | undefined
      path: string | undefined
    }
  ): void
}>()

const name = ref("")

const addFolder = () => {
  if (!name.value) {
    toast.error(`${t("folder.invalid_name")}`)
    return
  }
  emit("add-folder", {
    name: name.value,
    folder: props.folder,
    path: props.folderPath,
  })
  name.value = ""
}

const hideModal = () => {
  emit("hide-modal")
  name.value = ""
}
</script>
