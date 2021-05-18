<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("generate_code") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="requestType">{{ $t("choose_language") }}</label>
      <span class="select-wrapper">
        <v-popover>
          <pre v-if="requestType">{{
            codegens.find((x) => x.id === requestType).name
          }}</pre>
          <input
            v-else
            id="requestType"
            v-model="requestType"
            :placeholder="$t('choose_language')"
            class="cursor-pointer"
            readonly
            autofocus
          />
          <template slot="popover">
            <div v-for="gen in codegens" :key="gen.id">
              <button
                v-close-popover
                class="icon"
                @click="requestType = gen.id"
              >
                {{ gen.name }}
              </button>
            </div>
          </template>
        </v-popover>
      </span>
      <div class="row-wrapper">
        <label for="generatedCode">{{ $t("generated_code") }}</label>
        <div>
          <button
            ref="copyRequestCode"
            v-tooltip="$t('copy_code')"
            class="icon"
            @click="copyRequestCode"
          >
            <i class="material-icons">content_copy</i>
          </button>
        </div>
      </div>
      <SmartAceEditor
        v-if="requestType"
        ref="generatedCode"
        :value="requestCode"
        :lang="codegens.find((x) => x.id === requestType).language"
        :options="{
          maxLines: '10',
          minLines: '10',
          fontSize: '16px',
          autoScrollEditorIntoView: true,
          readOnly: true,
          showPrintMargin: false,
          useWorker: false,
        }"
        styles="rounded-b-lg"
      />
    </div>
  </SmartModal>
</template>

<script>
import { codegens } from "~/helpers/codegen/codegen"

export default {
  props: {
    show: Boolean,
    requestCode: { type: String, default: "" },
    requestTypeProp: { type: String, default: "curl" },
  },
  data() {
    return {
      codegens,
      copyButton: '<i class="material-icons">content_copy</i>',
      doneButton: '<i class="material-icons">done</i>',
    }
  },
  computed: {
    requestType: {
      get() {
        return this.requestTypeProp
      },
      set(val) {
        this.$emit("set-request-type", val)
      },
    },
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    handleImport() {
      this.$emit("handle-import")
    },
    copyRequestCode() {
      this.$refs.copyRequestCode.innerHTML = this.doneButton
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
      this.$refs.generatedCode.editor.selectAll()
      this.$refs.generatedCode.editor.focus()
      document.execCommand("copy")
      setTimeout(
        () => (this.$refs.copyRequestCode.innerHTML = this.copyButton),
        1000
      )
    },
  },
}
</script>
