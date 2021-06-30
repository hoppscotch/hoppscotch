<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("generate_code") }}</h3>
      <div>
        <button class="icon button" @click="hideModal">
          <i class="material-icons">close</i>
        </button>
      </div>
    </template>
    <template #body>
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
            class="input cursor-pointer"
            readonly
            autofocus
          />
          <template #popover>
            <div v-for="gen in codegens" :key="gen.id">
              <button
                v-close-popover
                class="icon button"
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
            class="icon button"
            @click="copyRequestCode"
          >
            <i class="material-icons">{{ copyIcon }}</i>
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
          fontSize: '15px',
          autoScrollEditorIntoView: true,
          readOnly: true,
          showPrintMargin: false,
          useWorker: false,
        }"
        styles="rounded-b-lg"
      />
    </template>
  </SmartModal>
</template>

<script>
import { codegens } from "~/helpers/codegen/codegen"

export default {
  props: {
    show: Boolean,
    requestCode: { type: String, default: null },
    requestTypeProp: { type: String, default: "curl" },
  },
  data() {
    return {
      codegens,
      copyIcon: "content_copy",
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
      this.$refs.generatedCode.editor.selectAll()
      this.$refs.generatedCode.editor.focus()
      document.execCommand("copy")
      this.copyIcon = "done"
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
      setTimeout(() => (this.copyIcon = "content_copy"), 1000)
    },
  },
}
</script>
