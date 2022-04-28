<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${$t('collection.new')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlAdd"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addNewCollection"
        />
        <label for="selectLabelGqlAdd">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${$t('action.save')}`"
          @click.native="addNewCollection"
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
import { HoppGQLRequest, makeCollection } from "@hoppscotch/data"
import { ref } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"
import { addGraphqlCollection } from "~/newstore/collections"

const toast = useToast()
const t = useI18n()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref("")

const hideModal = () => {
  emit("hide-modal")
  name.value = ""
}

const addNewCollection = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  addGraphqlCollection(
    makeCollection<HoppGQLRequest>({
      name: name.value,
      folders: [],
      requests: [],
    })
  )

  hideModal()
}
</script>
