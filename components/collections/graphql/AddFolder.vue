<template>
  <SmartModal v-if="show" @close="$emit('hide-modal')">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("new_folder") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="name"
        type="text"
        :placeholder="$t('my_new_folder')"
        @keyup.enter="addFolder"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="addFolder">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: {
    show: Boolean,
    folderPath: { type: String, default: null },
    collectionIndex: { type: Number, default: null },
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    addFolder() {
      // TODO: Blocking when name is null ?

      this.$emit("add-folder", {
        name: this.name,
        path: this.folderPath || `${this.collectionIndex}`,
      })
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
