<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('collection.edit')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelEdit"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="saveCollection"
        />
        <label for="selectLabelEdit">
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
          @click="saveCollection"
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
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    editingCollectionName: string
  }>(),
  {
    show: false,
    loadingState: false,
    editingCollectionName: "",
  }
)

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
}>()

const name = ref("")

watch(
  () => props.editingCollectionName,
  (newName) => {
    name.value = newName
  }
)

const saveCollection = () => {
  if (name.value.trim() === "") {
    toast.error(t("collection.invalid_name"))
    return
  }

  emit("submit", name.value)
}

const hideModal = () => {
  name.value = ""
  emit("hide-modal")
}
</script>
