<template>
  <SmartModal v-if="show" :title="$t('collection.edit')" @close="hideModal">
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

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    show: Boolean,
    placeholderCollName: { type: String, default: null },
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    saveCollection() {
      if (!this.name) {
        this.$toast.error(this.$t("collection.invalid_name"))
        return
      }
      this.$emit("submit", this.name)
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
