<template>
  <div>
    <div
      class="
        sticky
        top-110px
        z-10
        bg-primary
        flex flex-1
        items-center
        justify-between
        pl-4
        border-b border-dividerLight
      "
    >
      <label for="rawBody" class="font-semibold text-xs">
        {{ $t("raw_request_body") }}
      </label>
      <div>
        <ButtonSecondary
          v-if="rawInput && contentType.endsWith('json')"
          ref="prettifyRequest"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('prettify_body')"
          :icon="prettifyIcon"
          @click.native="prettifyRequestBody"
        />
        <label for="payload">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('import_json')"
            icon="post_add"
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
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent('rawParams', $event)"
        />
      </div>
    </div>
    <div class="relative">
      <SmartAceEditor
        v-model="rawParamsBody"
        :lang="rawInputEditorLang"
        :options="{
          maxLines: '16',
          minLines: '8',
          fontSize: '14px',
          autoScrollEditorIntoView: true,
          showPrintMargin: false,
          useWorker: false,
        }"
      />
    </div>
  </div>
</template>

<script>
import { getEditorLangForMimeType } from "~/helpers/editorutils"

export default {
  props: {
    rawParams: { type: String, default: null },
    contentType: { type: String, default: null },
    rawInput: { type: Boolean, default: false },
  },
  data() {
    return {
      prettifyIcon: "photo_filter",
    }
  },
  computed: {
    rawParamsBody: {
      get() {
        return this.rawParams
      },
      set(value) {
        this.$emit("update-raw-body", value)
      },
    },
    rawInputEditorLang() {
      return getEditorLangForMimeType(this.contentType)
    },
  },
  methods: {
    clearContent(bodyParams, $event) {
      this.$emit("clear-content", bodyParams, $event)
    },
    uploadPayload() {
      this.$emit("update-raw-input", true)
      const file = this.$refs.payload.files[0]
      if (file !== undefined && file !== null) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.$emit("update-raw-body", target.result)
        }
        reader.readAsText(file)
        this.$toast.info(this.$t("file_imported"), {
          icon: "attach_file",
        })
      } else {
        this.$toast.error(this.$t("choose_file"), {
          icon: "attach_file",
        })
      }
      this.$refs.payload.value = ""
    },
    prettifyRequestBody() {
      try {
        const jsonObj = JSON.parse(this.rawParamsBody)
        this.rawParamsBody = JSON.stringify(jsonObj, null, 2)
        this.prettifyIcon = "done"
        setTimeout(() => (this.prettifyIcon = "photo_filter"), 1000)
      } catch (e) {
        this.$toast.error(`${this.$t("json_prettify_invalid_body")}`, {
          icon: "error",
        })
      }
    },
  },
}
</script>
