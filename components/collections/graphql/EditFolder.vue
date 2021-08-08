<template>
  <SmartModal
    v-if="show"
    :title="$t('folder.edit')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlEditFolder"
          v-model="name"
          class="input floating-input"
          placeholder=" "
          type="text"
          @keyup.enter="editFolder"
        />
        <label for="selectLabelGqlEditFolder">
          {{ $t("label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="editFolder" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import Vue from "vue"
import { editGraphqlFolder } from "~/newstore/collections"

export default Vue.extend({
  props: {
    show: Boolean,
    folder: { type: Object, default: () => {} },
    folderPath: { type: String, default: null },
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    editFolder() {
      if (!this.name) {
        this.$toast.info(this.$t("collection.invalid_name").toString())
        return
      }
      editGraphqlFolder(this.folderPath, { ...this.folder, name: this.name })
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
