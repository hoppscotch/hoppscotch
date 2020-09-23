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
  @apply relative;

  input:focus + ul.suggestions,
  ul.suggestions:hover {
    @apply block;
  }

  ul.suggestions {
    @apply hidden;
    @apply bg-actColor;
    @apply absolute;
    @apply mx-2;
    @apply left-0;
    @apply z-50;
    @apply transition-transform;
    @apply ease-in-out;
    @apply duration-200;
    @apply shadow-lg;
    top: calc(100% - 8px);
    border-radius: 0 0 8px 8px;

    li {
      @apply w-full;
      @apply block;
      @apply p-2;
      @apply text-sm;
      @apply font-mono;
      @apply font-normal;

      &:last-child {
        border-radius: 0 0 8px 8px;
      }

      &:hover,
      &.active {
        @apply bg-acColor;
        @apply text-actColor;
        @apply cursor-pointer;
      }
    }
  }
}
</style>

<script>
export default {
  props: {
    spellcheck: {
      type: Boolean,
      default: true,
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
  },

  watch: {
    text() {
      this.$emit("input", this.text)
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
      let input = this.text.substring(0, this.selectionStart)
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
            this.currentSuggestionIndex - 1 >= 0 ? this.currentSuggestionIndex - 1 : 0
          break

        case "ArrowDown":
          event.preventDefault()
          this.currentSuggestionIndex =
            this.currentSuggestionIndex < this.suggestions.length - 1
              ? this.currentSuggestionIndex + 1
              : this.suggestions.length - 1
          break

        case "Tab":
          let activeSuggestion = this.suggestions[
            this.currentSuggestionIndex >= 0 ? this.currentSuggestionIndex : 0
          ]

          if (!activeSuggestion) {
            return
          }

          event.preventDefault()
          let input = this.text.substring(0, this.selectionStart)
          this.text = input + activeSuggestion
          break
      }
    },
  },

  computed: {
    /**
     * Gets the suggestions list to be displayed under the input box.
     *
     * @returns {default.props.source|{type, required}}
     */
    suggestions() {
      let input = this.text.substring(0, this.selectionStart)

      return (
        this.source
          .filter((entry) => {
            return (
              entry.toLowerCase().startsWith(input.toLowerCase()) &&
              input.toLowerCase() !== entry.toLowerCase()
            )
          })
          // Cut off the part that's already been typed.
          .map((entry) => entry.substring(this.selectionStart))
          // We only want the top 6 suggestions.
          .slice(0, 6)
      )
    },
  },

  mounted() {
    this.updateSuggestions({
      target: this.$refs.acInput,
    })
  },
}
</script>
