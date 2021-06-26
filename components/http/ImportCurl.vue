<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="heading">{{ $t("import_curl") }}</h3>
        <div>
          <button class="icon button" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <textarea
        id="import-curl"
        class="textarea"
        autofocus
        rows="8"
        :placeholder="$t('enter_curl')"
      ></textarea>
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon button" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon button primary" @click="handleImport">
            {{ $t("import") }}
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
