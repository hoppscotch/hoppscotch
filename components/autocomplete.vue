<template>
  <div class="autocomplete-wrapper">
    <input
      type="text"
      :placeholder="placeholder"
      v-model="text"
      @input="updateSuggestions"
      @keyup="updateSuggestions"
      @click="updateSuggestions"
      @keydown="handleKeystroke"
      ref="acInput"
      :spellcheck="spellcheck"
      :autocapitalize="spellcheck"
      :autocorrect="spellcheck"
    />
    <ul
      class="suggestions"
      v-if="suggestions.length > 0 && suggestionsVisible"
      :style="{ transform: `translate(${suggestionsOffsetLeft}px, 0)` }"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        @click.prevent="forceSuggestion(suggestion)"
        :class="{ active: currentSuggestionIndex === index }"
        :key="index"
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.autocomplete-wrapper {
  position: relative;

  input:focus + ul.suggestions,
  ul.suggestions:hover {
    display: block;
  }

  ul.suggestions {
    display: none;
    background-color: var(--atc-color);
    position: absolute;
    top: calc(100% - 4px);
    margin: 0 4px;
    left: 0;
    padding: 0;
    border-radius: 0 0 8px 8px;
    z-index: 9999;
    transition: transform 0.2s ease-out;
    box-shadow: 0 5px 30px rgba(black, 0.1);

    li {
      width: 100%;
      display: block;
      padding: 8px 16px;
      font-size: 16px;
      font-family: "Roboto Mono", monospace;
      font-weight: 400;

      &:last-child {
        border-radius: 0 0 8px 8px;
      }

      &:hover,
      &.active {
        background-color: var(--ac-color);
        color: var(--act-color);
        cursor: pointer;
      }
    }
  }
}
</style>

<script>
const KEY_TAB = 9;
const KEY_ESC = 27;

const KEY_ARROW_UP = 38;
const KEY_ARROW_DOWN = 40;

export default {
  props: {
    spellcheck: {
      type: Boolean,
      default: true,
      required: false
    },

    placeholder: {
      type: String,
      default: "",
      required: false
    },

    source: {
      type: Array,
      required: true
    },

    value: {
      type: String,
      default: "",
      required: false
    }
  },

  watch: {
    text() {
      this.$emit("input", this.text);
    }
  },

  data() {
    return {
      text: this.value,
      selectionStart: 0,
      suggestionsOffsetLeft: 0,
      currentSuggestionIndex: -1,
      suggestionsVisible: false
    };
  },

  methods: {
    updateSuggestions(event) {
      // Hide suggestions if ESC pressed.
      if (event.which && event.which === KEY_ESC) {
        event.preventDefault();
        this.suggestionsVisible = false;
        this.currentSuggestionIndex = -1;
        return;
      }

      // As suggestions is a reactive property, this implicitly
      // causes suggestions to update.
      this.selectionStart = this.$refs.acInput.selectionStart;
      this.suggestionsOffsetLeft = 12 * this.selectionStart;
      this.suggestionsVisible = true;
    },

    forceSuggestion(text) {
      let input = this.text.substring(0, this.selectionStart);
      this.text = input + text;

      this.selectionStart = this.text.length;
      this.suggestionsVisible = true;
      this.currentSuggestionIndex = -1;
    },

    handleKeystroke(event) {
      switch (event.which) {
        case KEY_ARROW_UP:
          event.preventDefault();
          this.currentSuggestionIndex =
            this.currentSuggestionIndex - 1 >= 0
              ? this.currentSuggestionIndex - 1
              : 0;
          break;

        case KEY_ARROW_DOWN:
          event.preventDefault();
          this.currentSuggestionIndex =
            this.currentSuggestionIndex < this.suggestions.length - 1
              ? this.currentSuggestionIndex + 1
              : this.suggestions.length - 1;
          break;

        case KEY_TAB:
          event.preventDefault();
          let activeSuggestion = this.suggestions[
            this.currentSuggestionIndex >= 0 ? this.currentSuggestionIndex : 0
          ];
          if (activeSuggestion) {
            let input = this.text.substring(0, this.selectionStart);
            this.text = input + activeSuggestion;
          }
          break;

        default:
          break;
      }
    }
  },

  computed: {
    /**
     * Gets the suggestions list to be displayed under the input box.
     *
     * @returns {default.props.source|{type, required}}
     */
    suggestions() {
      let input = this.text.substring(0, this.selectionStart);

      return (
        this.source
          .filter(entry => {
            return (
              entry.toLowerCase().startsWith(input.toLowerCase()) &&
              input.toLowerCase() !== entry.toLowerCase()
            );
          })
          // Cut off the part that's already been typed.
          .map(entry => entry.substring(this.selectionStart))
          // We only want the top 6 suggestions.
          .slice(0, 6)
      );
    }
  },

  mounted() {
    this.updateSuggestions({
      target: this.$refs.acInput
    });
  }
};
</script>
