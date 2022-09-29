<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${t('collection.new')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
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
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          :label="`${t('action.save')}`"
          @click="addNewCollection"
        />
        <ButtonSecondary :label="`${t('action.cancel')}`" @click="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { HoppGQLRequest, makeCollection } from "@hoppscotch/data"
import { addGraphqlCollection } from "~/newstore/collections"

export default defineComponent({
  props: {
    show: Boolean,
  },
  emits: ["hide-modal"],
  setup() {
    return {
      toast: useToast(),
      t: useI18n(),
    }
  },
  data() {
    return {
      name: null as string | null,
    }
  },
  methods: {
    addNewCollection() {
      if (!this.name) {
        this.toast.error(`${this.t("collection.invalid_name")}`)
        return
      }

      addGraphqlCollection(
        makeCollection<HoppGQLRequest>({
          name: this.name,
          folders: [],
          requests: [],
        })
      )

      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
