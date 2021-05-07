<template>
  <SmartModal v-if="show" @close="show = false">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("edit_folder") }}</h3>
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
        :placeholder="folder.name"
        @keyup.enter="editFolder"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="editFolder">
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
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    editFolder() {
      this.$emit("submit", this.name)
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
