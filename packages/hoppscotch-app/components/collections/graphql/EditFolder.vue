<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${$t('folder.edit')}`"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlEditFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="editFolder"
        />
        <label for="selectLabelGqlEditFolder">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${$t('action.save')}`"
          @click.native="editFolder"
        />
        <ButtonSecondary
          :label="`${$t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { editGraphqlFolder } from "~/newstore/collections"

export default defineComponent({
  props: {
    show: Boolean,
    folder: { type: Object, default: () => {} },
    folderPath: { type: String, default: null },
    editingFolderName: { type: String, default: null },
  },
  data() {
    return {
      name: "",
    }
  },
  watch: {
    editingFolderName(val) {
      this.name = val
    },
  },
  methods: {
    editFolder() {
      if (!this.name) {
        this.$toast.error(`${this.$t("collection.invalid_name")}`)
        return
      }
      editGraphqlFolder(this.folderPath, {
        ...(this.folder as any),
        name: this.name,
      })
      this.hideModal()
    },
    hideModal() {
      this.name = ""
      this.$emit("hide-modal")
    },
  },
})
</script>
