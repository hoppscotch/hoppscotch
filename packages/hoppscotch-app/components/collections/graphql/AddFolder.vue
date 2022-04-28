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
          id="selectLabelGqlAddFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addFolder"
        />
        <label for="selectLabelGqlAddFolder">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('action.save')" @click.native="addFolder" />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  folderPath?: string
  collectionIndex?: number
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "add-folder", v: { name: string; path: string }): void
}>()

const name = ref("")

const hideModal = () => {
  emit("hide-modal")
  name.value = ""
}

const addFolder = () => {
  if (!name.value) {
    toast.error(`${t("folder.name_length_insufficient")}`)
    return
  }

  emit("add-folder", {
    name: name.value,
    path: props.folderPath || `${props.collectionIndex}`,
  })

  hideModal()
}
</script>
