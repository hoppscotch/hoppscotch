<template>
  <SmartModal
    v-if="show"
    dialog
    :title="$t('collection.edit')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
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
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="$t('action.save')"
          :loading="loadingState"
          @click.native="saveCollection"
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
import { ref, watch } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  editingCollectionName: string
  loadingState: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "submit", v: string): void
}>()

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (show) name.value = props.editingCollectionName
  }
)

const saveCollection = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  emit("submit", name.value)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
