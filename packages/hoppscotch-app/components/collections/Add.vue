<template>
  <SmartModal
    v-if="show"
    dialog
    :title="$t('collection.new')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelAdd"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addNewCollection"
        />
        <label for="selectLabelAdd">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="$t('action.save')"
          :loading="loadingState"
          @click.native="addNewCollection"
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
import { ref } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

defineProps<{
  show: boolean
  loadingState: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "submit", name: string): void
}>()

const name = ref("")

const addNewCollection = () => {
  if (!name.value) {
    toast.error(t("collection.invalid_name"))
    return
  }
  emit("submit", name.value)
  name.value = ""
}
const hideModal = () => {
  emit("hide-modal")
  name.value = ""
}
</script>
