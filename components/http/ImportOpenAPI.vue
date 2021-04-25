<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("import_openapi") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>

    <div slot="body" class="flex flex-col">
      <button
        class="icon"
        @click="openDialogChooseFileToImportFrom"
        v-tooltip="$t('preserve_current')"
      >
        <i class="material-icons">folder_special</i>
        <span>{{ $t("import_json") }}</span>
        <input
          type="file"
          @change="importFromJSON"
          style="display: none"
          ref="inputChooseFileToImportFrom"
          accept="application/json"
        />
      </button>
      <textarea
        id="import-curl"
        autofocus
        rows="8"
        :placeholder="$t('enter_openapi_json')"
        v-model="spec"
      ></textarea>
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
  </SmartModal>
</template>

<script>
export default {
  data() {
    return {
      spec: "",
    }
  },
  props: {
    show: Boolean,
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    handleImport() {
      window.localStorage.setItem("openapi", this.$data.spec)
      this.$emit("handle-import")
    },
    openDialogChooseFileToImportFrom() {
      this.$refs.inputChooseFileToImportFrom.click()
    },
    importFromJSON() {
      let reader = new FileReader()
      reader.onload = ({ target }) => {
        this.$data.spec = target.result
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
    },
  },
}
</script>
