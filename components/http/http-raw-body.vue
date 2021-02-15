<template>
  <div>
    <ul>
      <li>
        <div class="row-wrapper">
          <label for="rawBody">{{ $t("raw_request_body") }}</label>
          <div>
            <button
              class="icon"
              @click="clearContent('rawParams', $event)"
              v-tooltip.bottom="$t('clear')"
            >
              <i class="material-icons">clear_all</i>
            </button>
          </div>
        </div>
        <ace-editor
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
      </li>
    </ul>
  </div>
</template>

<script>
import { getEditorLangForMimeType } from "~/helpers/editorutils"

export default {
  props: {
    rawParams: { type: Object, default: () => {} },
    contentType: { type: String, default: "" },
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
  },
}
</script>
