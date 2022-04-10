<template>
  <SmartModal
    v-if="show"
    dialog
    :title="$t('request.new')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelAddRequest"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addRequest"
        />
        <label for="selectLabelAddRequest">{{ $t("action.label") }}</label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('action.save')" @click.native="addRequest" />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { useRESTRequestName } from "~/newstore/RESTSession"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  folder?: object
  folderPath?: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "add-request", v: object): void
}>()

const name = useRESTRequestName()

const addRequest = () => {
  if (!name.value) {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }
  emit("add-request", {
    name: name.value,
    folder: props.folder,
    path: props.folderPath,
  })
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
