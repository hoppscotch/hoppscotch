<template>
  <pre ref="editor"></pre>
</template>

<script>
const DEFAULT_THEME = 'dracula';

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
      required: false
    },
    lang: {
      type: String,
      default: 'json',
    },
    options: {
      type: Object,
      default: {}
    }
  },

  data() {
    return {
      editor: null,
      cacheValue: ''
    }
  },

  watch: {
    value(value) {
      if(value !== this.cacheValue) {
        this.editor.session.setValue(value,1);
        this.cacheValue = value;
      }

    },
    theme() {
      this.editor.setTheme('ace/theme/' + this.defineTheme())
    },
    lang(value) {
      this.editor.getSession().setMode('ace/mode/' + value);
    },
    options(value) {
      this.editor.setOptions(value);
    }
  },

  mounted() {
    const editor = ace.edit(this.$refs.editor, {
      theme: 'ace/theme/'+ this.defineTheme(),
      mode: "ace/mode/" + this.lang,
      ...this.options
      })

    editor.setValue(this.value);

    this.editor = editor;
    this.cacheValue = this.value;
  },

  methods: {
    defineTheme() {
      if(this.theme) {
        return this.theme;
      } else {
        return this.$store.state.postwoman.settings.THEME_ACE_EDITOR || DEFAULT_THEME
      }
    }
  },

  beforeDestroy() {
    this.editor.destroy();
    this.editor.container.remove();
  }
}
</script>
