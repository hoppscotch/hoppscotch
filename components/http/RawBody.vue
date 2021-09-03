<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-upperTertiaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("request.raw_body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
          blank
          :title="$t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear')"
          svg="trash-2"
          @click.native="clearContent('rawParams', $event)"
        />
        <ButtonSecondary
          v-if="contentType && contentType.endsWith('json')"
          ref="prettifyRequest"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.prettify')"
          :svg="prettifyIcon"
          @click.native="prettifyRequestBody"
        />
        <label for="payload">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('import.json')"
            svg="file-plus"
            @click.native="$refs.payload.click()"
          />
        </label>
        <input
          ref="payload"
          class="input"
          name="payload"
          type="file"
          @change="uploadPayload"
        />
      </div>
    </div>
    <div class="relative">
      <SmartAceEditor
        v-model="rawParamsBody"
        :lang="rawInputEditorLang"
        :options="{
          maxLines: Infinity,
          minLines: 16,
          autoScrollEditorIntoView: true,
          showPrintMargin: false,
          useWorker: false,
        }"
        styles="border-b border-dividerLight"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { getEditorLangForMimeType } from "~/helpers/editorutils"
import { pluckRef } from "~/helpers/utils/composables"
import { useRESTRequestBody } from "~/newstore/RESTSession"

export default defineComponent({
  props: {
    contentType: {
      type: String,
      required: true,
    },
  },
  setup() {
    return {
      rawParamsBody: pluckRef(useRESTRequestBody(), "body"),
      prettifyIcon: "align-left",
    }
  },
  computed: {
    rawInputEditorLang() {
      return getEditorLangForMimeType(this.contentType)
    },
  },
  methods: {
    clearContent() {
      this.rawParamsBody = ""
    },
    uploadPayload() {
      const file = this.$refs.payload.files[0]
      if (file !== undefined && file !== null) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.rawParamsBody = target.result
        }
        reader.readAsText(file)
        this.$toast.success(this.$t("state.file_imported"), {
          icon: "attach_file",
        })
      } else {
        this.$toast.error(this.$t("action.choose_file"), {
          icon: "attach_file",
        })
      }
      this.$refs.payload.value = ""
    },
    prettifyRequestBody() {
      try {
        const jsonObj = JSON.parse(this.rawParamsBody)
        this.rawParamsBody = JSON.stringify(jsonObj, null, 2)
        this.prettifyIcon = "check"
        setTimeout(() => (this.prettifyIcon = "align-left"), 1000)
      } catch (e) {
        console.error(e)
        this.$toast.error(`${this.$t("error.json_prettify_invalid_body")}`, {
          icon: "error_outline",
        })
      }
    },
  },
})
</script>
