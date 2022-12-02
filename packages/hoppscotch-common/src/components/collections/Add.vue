<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('collection.new')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
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
          @click="addNewCollection"
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

<script lang="ts">
import { defineComponent } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"

export default defineComponent({
  props: {
    show: Boolean,
    loadingState: Boolean,
  },
  emits: ["submit", "hide-modal"],
  setup() {
    return {
      toast: useToast(),
      t: useI18n(),
    }
  },
  data() {
    return {
      name: null,
    }
  },
  watch: {
    show(isShowing: boolean) {
      if (!isShowing) {
        this.name = null
      }
    },
  },
  methods: {
    addNewCollection() {
      if (!this.name) {
        this.toast.error(this.t("collection.invalid_name"))
        return
      }
      this.$emit("submit", this.name)
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
