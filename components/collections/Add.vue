<template>
  <SmartModal v-if="show" :title="$t('collection.new')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelAdd"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
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

<script>
export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    addNewCollection() {
      if (!this.name) {
        this.$toast.error(this.$t("collection.invalid_name"), {
          icon: "error_outline",
        })
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
}
</script>
