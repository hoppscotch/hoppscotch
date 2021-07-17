<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("generate_code") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="requestType" class="font-semibold text-xs px-4 pb-4">
          {{ $t("choose_language") }}
        </label>
        <div class="flex flex-1">
          <span class="select-wrapper">
            <tippy
              ref="options"
              interactive
              tabindex="-1"
              trigger="click"
              theme="popover"
              arrow
            >
              <template #trigger>
                <span
                  class="
                    bg-primaryLight
                    border-b border-dividerLight
                    rounded-lg
                    cursor-pointer
                    flex
                    font-semibold
                    text-xs
                    w-full
                    py-3
                    px-4
                    focus:outline-none
                  "
                >
                  {{ codegens.find((x) => x.id === requestType).name }}
                </span>
              </template>
              <SmartItem
                v-for="(gen, index) in codegens"
                :key="`gen-${index}`"
                :label="gen.name"
                @click.native="
                  requestType = gen.id
                  $refs.options.tippy().hide()
                "
              />
            </tippy>
          </span>
        </div>
        <div class="flex flex-1 justify-between">
          <label
            for="generatedCode"
            class="font-semibold text-xs px-4 pt-4 pb-4"
          >
            {{ $t("generated_code") }}
          </label>
          <ButtonSecondary
            ref="copyRequestCode"
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('copy_code')"
            :icon="copyIcon"
            @click.native="copyRequestCode"
          />
        </div>
        <SmartAceEditor
          v-if="requestType"
          ref="generatedCode"
          :value="requestCode"
          :lang="codegens.find((x) => x.id === requestType).language"
          :options="{
            maxLines: '10',
            minLines: '10',
            fontSize: '14px',
            autoScrollEditorIntoView: true,
            readOnly: true,
            showPrintMargin: false,
            useWorker: false,
          }"
          styles="rounded-lg"
        />
      </div>
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
