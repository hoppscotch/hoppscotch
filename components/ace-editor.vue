<template>
  <pre ref="editor"></pre>
</template>

<script>
import ace from 'ace-builds';
import "ace-builds/webpack-resolver";

export default {

  props: {
    value: {
      type: String,
      default: ''
    },
    theme: {
      type: String,
      default: 'dracula'
    },
    lang: {
      type: String,
      default: 'json'
    },
    rows: {
      type: Number,
      default: 16
    },
    fontSize: {
      type: String,
      default: '16px'
    },
    placeholder: {
      type: String,
      default: ''
    },
    checkSyntax: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      editor: null,
      cacheValue: ''
    }
  },

  watch: {
    value(val) {
      if(val !== this.cacheValue) {
        this.editor.session.setValue(val,1);
        this.cacheValue = val;
      }

    }
  },

  mounted() {
    const editor = ace.edit(this.$refs.editor, {
      theme: 'ace/theme/'+ this.theme,
      mode: "ace/mode/" + this.lang,
      maxLines: this.rows,
      minLines: this.rows,
      fontSize: this.fontSize,
      autoScrollEditorIntoView: true,
      readOnly: true,
      showPrintMargin: false,
    })

    editor.setValue(this.value);
    this.cacheValue = this.value;

    editor.session.setUseWorker(this.checkSyntax)

    this.editor = editor;
  },

  beforeDestroy() {
    this.editor.destroy();
    this.editor.container.remove();
  }
}
</script>
