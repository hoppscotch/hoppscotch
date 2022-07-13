<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('collection.new')"
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
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          @click.native="addNewCollection"
        />
        <ButtonSecondary
          :label="t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"

export default defineComponent({
  props: {
    show: Boolean,
    loadingState: Boolean,
  },
  setup() {
    return {
      toast: useToast(),
      i18n: useI18n()
    }
  },
  data() {
    return {
      name: null,
    }
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
