<template>
  <SmartModal
    v-if="show"
    :title="$t('request.generate_code')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <label for="requestType" class="px-4 pb-4">
          {{ $t("request.choose_language") }}
        </label>
        <div class="flex flex-1">
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
          >
            <template #trigger>
              <span class="select-wrapper">
                <ButtonSecondary
                  :label="codegens.find((x) => x.id === codegenType).name"
                  outline
                  class="pr-8"
                />
              </span>
            </template>
            <SmartItem
              v-for="(gen, index) in codegens"
              :key="`gen-${index}`"
              :label="gen.name"
              :info-icon="gen.id === codegenType ? 'done' : ''"
              :active-info-icon="gen.id === codegenType"
              @click.native="
                codegenType = gen.id
                $refs.options.tippy().hide()
              "
            />
          </tippy>
        </div>
        <div class="flex flex-1 justify-between">
          <label for="generatedCode" class="px-4 pt-4 pb-4">
            {{ $t("request.generated_code") }}
          </label>
        </div>
        <SmartAceEditor
          v-if="codegenType"
          ref="generatedCode"
          :value="requestCode"
          :lang="codegens.find((x) => x.id === codegenType).language"
          :options="{
            maxLines: 16,
            minLines: 8,
            autoScrollEditorIntoView: true,
            readOnly: true,
            showPrintMargin: false,
            useWorker: false,
          }"
          styles="rounded"
        />
      </div>
    </template>
    <template #footer>
      <ButtonPrimary
        ref="copyRequestCode"
        :label="$t('action.copy')"
        :icon="copyIcon"
        @click.native="copyRequestCode"
      />
      <ButtonSecondary
        :label="$t('action.dismiss')"
        @click.native="hideModal"
      />
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { codegens } from "~/helpers/codegen/codegen"
import { getRESTRequest } from "~/newstore/RESTSession"
import { getEffectiveRESTRequest } from "~/helpers/utils/EffectiveURL"
import { getCurrentEnvironment } from "~/newstore/environments"
import { copyToClipboard } from "~/helpers/utils/clipboard"

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
      // TODO: Implement updated auth stuff
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
      copyToClipboard(this.requestCode)
      this.copyIcon = "done"
      this.$toast.success(this.$t("copied_to_clipboard").toString(), {
        icon: "done",
      })
      setTimeout(() => (this.copyIcon = "content_copy"), 1000)
    },
  },
})
</script>
