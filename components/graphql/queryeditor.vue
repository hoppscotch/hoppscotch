<template>
  <pre ref="editor"></pre>
</template>

<script>
const DEFAULT_THEME = "twilight";

import ace from "ace-builds";
import * as gql from "graphql";
import "ace-builds/webpack-resolver";
import debounce from "../../functions/utils/debounce";

export default {
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
      editor: null,
      cacheValue: "",
      validationSchema: null 
    };
  },

  watch: {
    value(value) {
      if (value !== this.cacheValue) {
        this.editor.session.setValue(value, 1);
        this.cacheValue = value;
      }
    },
    theme() {
      this.editor.setTheme("ace/theme/" + this.defineTheme());
    },
    lang(value) {
      this.editor.getSession().setMode("ace/mode/" + value);
    },
    options(value) {
      this.editor.setOptions(value);
    }
  },

  mounted() {
    const editor = ace.edit(this.$refs.editor, {
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
      this.parseContents(content);
      this.cacheValue = content;
    });

    this.parseContents(this.value);
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
    },
    
    setValidationSchema(schema) {
      this.validationSchema = schema;
      this.parseContents(this.cacheValue);
    },

    parseContents: debounce(function(content) {
      if (content !== "") {
        try {
          const doc = gql.parse(content);

          if (this.validationSchema) {
            this.editor.session.setAnnotations(
              gql.validate(this.validationSchema, doc)
                .map((err) => {
                  return {
                    row: err.locations[0].line - 1,
                    column: err.locations[0].column - 1,
                    text: err.message,
                    type: "error"
                  }
                })
            )
          }
        } catch (e) {
          this.editor.session.setAnnotations([
            {
              row: e.locations[0].line - 1,
              column: e.locations[0].column - 1,
              text: e.message,
              type: "error"
            }
          ]);
        }
      } else {
        this.editor.session.setAnnotations([]);
      }
    }, 2000)
  },

  beforeDestroy() {
    this.editor.destroy();
    this.editor.container.remove();
  }
};
</script>
