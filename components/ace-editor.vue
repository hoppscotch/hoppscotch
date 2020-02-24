<template>
  <pre ref="editor"></pre>
</template>

<script>
const DEFAULT_THEME = 'twilight'

import ace from 'ace-builds'
import 'ace-builds/webpack-resolver'

export default {
  props: {
    value: {
      type: String,
      default: '',
    },
    theme: {
      type: String,
      required: false,
    },
    lang: {
      type: String,
      default: 'json',
    },
    options: {
      type: Object,
      default: {},
    },
  },

  data() {
    return {
      editor: null,
      cacheValue: '',
    }
  },

  watch: {
    value(value) {
      if (value !== this.cacheValue) {
        this.editor.session.setValue(value, 1)
        this.cacheValue = value
      }
    },
    theme() {
      this.editor.setTheme('ace/theme/' + this.defineTheme())
    },
    lang(value) {
      this.editor.getSession().setMode('ace/mode/' + value)
    },
    options(value) {
      this.editor.setOptions(value)
    },
  },

  mounted() {
    const editor = ace.edit(this.$refs.editor, {
      theme: `ace/theme/${this.defineTheme()}`,
      mode: `ace/mode/${this.lang}`,
      ...this.options,
    })

    if (this.value) editor.setValue(this.value, 1)

    this.editor = editor
    this.cacheValue = this.value

    editor.on('change', () => {
      const content = editor.getValue()
      this.$emit('input', content)
      this.cacheValue = content
    })
  },

  methods: {
    defineTheme() {
      if (this.theme) {
        return this.theme
      }
      return this.$store.state.postwoman.settings.THEME_ACE_EDITOR || DEFAULT_THEME
    },
  },

  beforeDestroy() {
    this.editor.destroy()
    this.editor.container.remove()
  },
}
</script>
