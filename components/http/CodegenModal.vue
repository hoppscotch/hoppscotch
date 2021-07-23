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
                    rounded
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
                  {{ codegens.find((x) => x.id === codegenType).name }}
                </span>
              </template>
              <SmartItem
                v-for="(gen, index) in codegens"
                :key="`gen-${index}`"
                :label="gen.name"
                @click.native="
                  codegenType = gen.id
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
          v-if="codegenType"
          ref="generatedCode"
          :value="requestCode"
          :lang="codegens.find((x) => x.id === codegenType).language"
          :options="{
            maxLines: '10',
            minLines: '10',
            fontSize: '14px',
            autoScrollEditorIntoView: true,
            readOnly: true,
            showPrintMargin: false,
            useWorker: false,
          }"
          styles="rounded"
        />
      </div>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { codegens } from "~/helpers/codegen/codegen"
import { getRESTRequest } from "~/newstore/RESTSession"
import { getEffectiveRESTRequest } from "~/helpers/utils/EffectiveURL"
import { getCurrentEnvironment } from "~/newstore/environments"

export default defineComponent({
  props: {
    show: Boolean,
  },
  data() {
    return {
      codegens,
      copyIcon: "content_copy",
      request: getRESTRequest(),
      codegenType: "curl",
    }
  },
  computed: {
    requestCode(): string {
      const effectiveRequest = getEffectiveRESTRequest(
        this.request,
        getCurrentEnvironment()
      )

      const urlObj = new URL(effectiveRequest.effectiveFinalURL)
      const baseURL = urlObj.origin
      const path = urlObj.pathname

      // TODO: Solidify
      return codegens
        .find((x) => x.id === this.codegenType)!
        .generator({
          auth: "None",
          httpUser: null,
          httpPassword: null,
          method: effectiveRequest.method,
          url: baseURL,
          pathName: path,
          queryString: urlObj.searchParams.toString(),
          bearerToken: null,
          headers: effectiveRequest.effectiveFinalHeaders,
          rawInput: null,
          rawParams: null,
          rawRequestBody: "",
          contentType: effectiveRequest.effectiveFinalHeaders.find(
            (x) => x.key === "content-type"
          ),
        })
    },
  },
  watch: {
    show(goingToShow) {
      if (goingToShow) {
        this.request = getRESTRequest()
      }
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
      const editor: any = this.$refs.generatedCode

      editor.editor.selectAll()
      editor.editor.focus()

      document.execCommand("copy")
      this.copyIcon = "done"
      this.$toast.success(this.$t("copied_to_clipboard").toString(), {
        icon: "done",
      })
    },
  },
})
</script>
