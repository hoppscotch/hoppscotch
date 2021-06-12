<template>
  <div class="autocomplete-wrapper">
    <input
      ref="acInput"
      v-model="text"
      type="text"
      :placeholder="placeholder"
      :spellcheck="spellcheck"
      :autocapitalize="autocapitalize"
      :autocorrect="spellcheck"
      :class="styles"
      @input="updateSuggestions"
      @keyup="updateSuggestions"
      @click="updateSuggestions"
      @keydown="handleKeystroke"
    />
    <ul
      v-if="suggestions.length > 0 && suggestionsVisible"
      class="suggestions"
      :style="{ transform: `translate(${suggestionsOffsetLeft}px, 0)` }"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        :key="index"
        :class="{ active: currentSuggestionIndex === index }"
        @click.prevent="forceSuggestion(suggestion)"
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    spellcheck: {
      type: Boolean,
      default: true,
      required: false,
    },

    autocapitalize: {
      type: String,
      default: "off",
      required: false,
    },

    placeholder: {
      type: String,
      default: "",
      required: false,
    },

    source: {
      type: Array,
      required: true,
    },

    value: {
      type: String,
      default: "",
      required: false,
    },

    styles: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      text: this.value,
      selectionStart: 0,
      suggestionsOffsetLeft: 0,
      currentSuggestionIndex: -1,
      suggestionsVisible: false,
    }
  },

  computed: {
    /**
     * Gets the suggestions list to be displayed under the input box.
     *
     * @returns {default.props.source|{type, required}}
     */
    suggestions() {
      const input = this.text.substring(0, this.selectionStart)

      return (
        this.source
          .filter(
            (entry) =>
              entry.toLowerCase().startsWith(input.toLowerCase()) &&
              input.toLowerCase() !== entry.toLowerCase()
          )
          // Cut off the part that's already been typed.
          .map((entry) => entry.substring(this.selectionStart))
          // We only want the top 6 suggestions.
          .slice(0, 6)
      )
    },
  },

  watch: {
    text() {
      this.$emit("input", this.text)
    },
    value(newValue) {
      this.text = newValue
    },
  },

  mounted() {
    this.updateSuggestions({
      target: this.$refs.acInput,
    })
  },

  methods: {
    updateSuggestions(event) {
      // Hide suggestions if ESC pressed.
      if (event.code && event.code === "Escape") {
        event.preventDefault()
        this.suggestionsVisible = false
        this.currentSuggestionIndex = -1
        return
      }

      // As suggestions is a reactive property, this implicitly
      // causes suggestions to update.
      this.selectionStart = this.$refs.acInput.selectionStart
      this.suggestionsOffsetLeft = 12 * this.selectionStart
      this.suggestionsVisible = true
    },

    forceSuggestion(text) {
      const input = this.text.substring(0, this.selectionStart)
      this.text = input + text

      this.selectionStart = this.text.length
      this.suggestionsVisible = true
      this.currentSuggestionIndex = -1
    },

    handleKeystroke(event) {
      switch (event.code) {
        case "ArrowUp":
          event.preventDefault()
          this.currentSuggestionIndex =
            this.currentSuggestionIndex - 1 >= 0
              ? this.currentSuggestionIndex - 1
              : 0
          break

        case "ArrowDown":
          event.preventDefault()
          this.currentSuggestionIndex =
            this.currentSuggestionIndex < this.suggestions.length - 1
              ? this.currentSuggestionIndex + 1
              : this.suggestions.length - 1
          break

        case "Tab": {
          const activeSuggestion =
            this.suggestions[
              this.currentSuggestionIndex >= 0 ? this.currentSuggestionIndex : 0
            ]

          if (!activeSuggestion) {
            return
          }

          event.preventDefault()
          const input = this.text.substring(0, this.selectionStart)
          this.text = input + activeSuggestion
          break
        }
      }
    },
  },
}
</script>

<style scoped lang="scss">
.autocomplete-wrapper {
  @apply relative;

  input:focus + ul.suggestions,
  ul.suggestions:hover {
    @apply block;
  }

  ul.suggestions {
    @apply hidden;
    @apply bg-primary;
    @apply absolute;
    @apply mx-2;
    @apply left-0;
    @apply z-50;
    @apply transition;
    @apply ease-in-out;
    @apply duration-150;
    @apply shadow-lg;

    top: calc(100% - 8px);
    border-radius: 0 0 8px 8px;

    li {
      @apply w-full;
      @apply block;
      @apply py-2;
      @apply px-4;
      @apply text-sm;
      @apply font-mono;
      @apply font-normal;

      &:last-child {
        border-radius: 0 0 8px 8px;
      }

      &:hover,
      &.active {
        @apply bg-accent;
        @apply text-primary;
        @apply cursor-pointer;
      }
    }
  }
}
</style>
