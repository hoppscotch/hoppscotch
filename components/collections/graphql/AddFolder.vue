<template>
  <SmartModal v-if="show" @close="show = false">
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
        type="text"
        id="selectLabel"
        v-model="name"
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

<script>
export default {
  props: {
    show: Boolean,
    folder: Object,
    folderPath: String,
    collectionIndex: Number,
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    addFolder() {
      this.$emit("add-folder", {
        name: this.name,
        folder: this.folder,
        path: this.folderPath || `${this.collectionIndex}`,
      })
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
