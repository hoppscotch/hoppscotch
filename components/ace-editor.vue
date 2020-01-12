<template>
  <pre ref="editor"></pre>
</template>

<script lang="ts">
import Vue from "vue";
import ace from "ace-builds";
import "ace-builds/webpack-resolver";

const DEFAULT_THEME = "twilight";

export default Vue.extend({
  props: {
    value: {
      type: String,
      default: ""
    },
    theme: {
      type: String,
      required: false
    },
    lang: {
      type: String,
      default: "json"
    },
    options: {
      type: Object,
      default: {}
    }
  },

  data() {
    return {
      editor: null as ace.Ace.Editor | null,
      cacheValue: ""
    };
  },

  watch: {
    value(value) {
      if (this.editor && value !== this.cacheValue) {
        this.editor.session.setValue(value);
        this.cacheValue = value;
      }
    },
    theme() {
      if (this.editor) this.editor.setTheme("ace/theme/" + this.defineTheme());
    },
    lang(value) {
      if (this.editor) this.editor.getSession().setMode("ace/mode/" + value);
    },
    options(value) {
      if (this.editor) this.editor.setOptions(value);
    }
  },

  mounted() {
    const editor = ace.edit(this.$refs.editor as Element, {
      theme: "ace/theme/" + this.defineTheme(),
      mode: "ace/mode/" + this.lang,
      ...this.options
    });

    if (this.value) editor.setValue(this.value, 1);

    this.editor = editor;
    this.cacheValue = this.value;

    editor.on("change", () => {
      const content = editor.getValue();
      this.$emit("input", content);
      this.cacheValue = content;
    });
  },

  methods: {
    defineTheme() {
      if (this.theme) {
        return this.theme;
      } else {
        return (
          this.$store.state.postwoman.settings.THEME_ACE_EDITOR || DEFAULT_THEME
        );
      }
    }
  },

  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy();
      this.editor.container.remove();
    }
  }
});
</script>
