<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("generate_code") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <label for="requestType">{{ $t("choose_language") }}</label>
      <span class="select-wrapper">
        <tippy tabindex="-1" trigger="click" theme="popover" arrow>
          <template #trigger>
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
          </template>
          <div v-for="gen in codegens" :key="gen.id">
            <ButtonSecondary @click.native="requestType = gen.id" />
            {{ gen.name }}
          </div>
        </tippy>
      </span>
      <div class="row-wrapper">
        <label for="generatedCode">{{ $t("generated_code") }}</label>
        <div>
          <ButtonSecondary
            ref="copyRequestCode"
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('copy_code')"
            :icon="copyIcon"
            @click.native="copyRequestCode"
          />
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
