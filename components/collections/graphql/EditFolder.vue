<template>
  <SmartModal v-if="show" @close="$emit('hide-modal')">
    <template #header>
      <h3 class="heading">{{ $t("edit_folder") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label
          for="selectLabelGqlEditFolder"
          class="font-semibold text-xs px-4 pb-4"
        >
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelGqlEditFolder"
          v-model="name"
          class="input"
          type="text"
          :placeholder="folder.name"
          @keyup.enter="editFolder"
        />
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
