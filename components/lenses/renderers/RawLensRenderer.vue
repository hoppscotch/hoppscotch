<template>
  <ul>
    <li>
      <Editor
        :value="responseBodyText"
        :lang="'plain_text'"
        :options="{
          maxLines: 16,
          minLines: '16',
          fontSize: '16px',
          autoScrollEditorIntoView: true,
          readOnly: true,
          showPrintMargin: false,
          useWorker: false,
        }"
      />
    </li>
  </ul>
</template>
<script>
import AceEditor from "../../ui/ace-editor"

export default {
  components: {
    Editor: AceEditor,
  },
  props: {
    response: {},
  },
  computed: {
    responseBodyText() {
      return new TextDecoder("utf-8").decode(new Uint8Array(this.response.body))
    },
  },
}
</script>
