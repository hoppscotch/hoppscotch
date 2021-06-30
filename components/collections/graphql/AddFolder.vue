<template>
  <SmartModal v-if="show" @close="$emit('hide-modal')">
    <template #header>
      <h3 class="heading">{{ $t("new_folder") }}</h3>
      <div>
        <button class="icon button" @click="hideModal">
          <i class="material-icons">close</i>
        </button>
      </div>
    </template>
    <template #body>
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="name"
        class="input"
        type="text"
        :placeholder="$t('my_new_folder')"
        @keyup.enter="addFolder"
      />
    </template>
    <template #footer>
      <span></span>
      <span>
        <button class="icon button" @click="hideModal">
          {{ $t("cancel") }}
        </button>
        <button class="icon button primary" @click="addFolder">
          {{ $t("save") }}
        </button>
      </span>
    </template>
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
