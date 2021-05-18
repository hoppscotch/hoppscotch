<template>
  <div>
    <ul>
      <li>
        <div class="row-wrapper">
          <label for="rawBody">{{ $t("raw_request_body") }}</label>
          <div>
            <button
              v-if="rawInput && contentType.endsWith('json')"
              ref="prettifyRequest"
              v-tooltip="$t('prettify_body')"
              class="icon"
              @click="prettifyRequestBody"
            >
              <i class="material-icons">photo_filter</i>
            </button>
            <label for="payload" class="p-0">
              <button
                v-tooltip="$t('import_json')"
                class="icon"
                @click="$refs.payload.click()"
              >
                <i class="material-icons">post_add</i>
              </button>
            </label>
            <input
              ref="payload"
              name="payload"
              type="file"
              @change="uploadPayload"
            />
            <button
              v-tooltip.bottom="$t('clear')"
              class="icon"
              @click="clearContent('rawParams', $event)"
            >
              <i class="material-icons">clear_all</i>
            </button>
          </div>
        </div>
        <div class="relative">
          <SmartAceEditor
            v-model="rawParamsBody"
            :lang="rawInputEditorLang"
            :options="{
              maxLines: '16',
              minLines: '8',
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false,
            }"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { getEditorLangForMimeType } from "~/helpers/editorutils"

export default {
  props: {
    rawParams: { type: String, default: "{}" },
    contentType: { type: String, default: "" },
    rawInput: { type: Boolean, default: false },
  },
  data() {
    return {
      doneButton: '<i class="material-icons">done</i>',
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
        const oldIcon = this.$refs.prettifyRequest.innerHTML
        this.$refs.prettifyRequest.innerHTML = this.doneButton
        setTimeout(() => (this.$refs.prettifyRequest.innerHTML = oldIcon), 1000)
      } catch (e) {
        this.$toast.error(`${this.$t("json_prettify_invalid_body")}`, {
          icon: "error",
        })
      }
    },
  },
}
</script>
