<template>
  <div class="autocomplete-wrapper">
    <input ref="acInput" :value="text" type="text" autocomplete="off" :placeholder="placeholder" :spellcheck="spellcheck"
      :autocapitalize="autocapitalize" :class="styles" @input.stop="
        (e) => {
          $emit('input', e.target.value)
          updateSuggestions(e)
        }
      " @keyup="updateSuggestions" @click="updateSuggestions" @keydown="handleKeystroke"
      @change="$emit('change', $event)" />
    <ul v-if="suggestions.length > 0 && suggestionsVisible" class="suggestions"
      :style="{ transform: `translate(${suggestionsOffsetLeft}px, 0)` }">
      <li v-for="(suggestion, index) in suggestions" :key="`suggestion-${index}`"
        :class="{ active: currentSuggestionIndex === index }" @click.prevent="forceSuggestion(suggestion)">
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<script>
import { defineComponent } from "vue"

export default defineComponent({
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
  emits: ["input", "change"],
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
          // We only want the top 10 suggestions.
          .slice(0, 10)
      )
    },
  },

  watch: {
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

      this.$emit("input", this.text)
    },

    handleKeystroke(event) {
      switch (event.code) {
        case "Enter":
          event.preventDefault()
          if (this.currentSuggestionIndex > -1)
            this.forceSuggestion(
              this.suggestions.find(
                (_item, index) => index === this.currentSuggestionIndex
              )
            )
          break

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
})
</script>

<style lang="scss" scoped>
.autocomplete-wrapper {
  @apply relative;
  @apply contents;

  input:focus+ul.suggestions,
  ul.suggestions:hover {
    @apply block;
  }

  ul.suggestions {
    @apply hidden;
    @apply bg-popover;
    @apply absolute;
    @apply mx-2;
    @apply left-0;
    @apply z-50;
    @apply shadow-lg;
    @apply max-h-46;
    @apply overflow-y-auto;
    top: calc(100% - 4px);
    border-radius: 0 0 8px 8px;

    li {
      @apply w-full;
      @apply block;
      @apply py-2 px-4;
      @apply text-secondary;

      &:last-child {
        border-radius: 0 0 8px 8px;
      }

      &:hover,
      &.active {
        @apply bg-accentDark;
        @apply text-accentContrast;
        @apply cursor-pointer;
      }
    }
  }
}
</style>
