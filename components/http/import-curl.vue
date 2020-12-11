<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("import_curl") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <textarea id="import-curl" autofocus rows="8" :placeholder="$t('enter_curl')"></textarea>
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="handleImport">
            {{ $t("import") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
export default {
  props: {
    show: Boolean,
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    handleImport() {
      this.$emit("handle-import")
    },
  },
}
</script>
