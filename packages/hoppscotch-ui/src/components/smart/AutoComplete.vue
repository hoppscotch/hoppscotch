<template>
  <div class="autocomplete-wrapper">
    <input
      ref="acInput"
      v-model="text"
      type="text"
      autocomplete="off"
      :placeholder="placeholder"
      :spellcheck="spellcheck"
      :autocapitalize="autocapitalize"
      :class="styles"
      @input.stop="onInput"
      @keyup="updateSuggestions"
      @click="updateSuggestions"
      @keydown="handleKeystroke"
      @change="emit('change', $event)"
    />
    <ul v-if="suggestions.length > 0 && suggestionsVisible" class="suggestions">
      <li
        v-for="(suggestion, index) in suggestions"
        :key="`suggestion-${index}`"
        :class="{ active: currentSuggestionIndex === index }"
        @click.prevent="forceSuggestion(suggestion)"
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from "vue"

const acInput = ref<HTMLInputElement>()

const props = defineProps({
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
    type: Array<string>,
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
})

const emit = defineEmits<{
  (e: "input", v: string): void
  (e: "change", v: Event): void
}>()

const text = ref(props.value)
const selectionStart = ref(0)
const currentSuggestionIndex = ref(-1)
const suggestionsVisible = ref(false)

onMounted(() => {
  updateSuggestions({
    target: acInput,
  })
})

const suggestions = computed(() => {
  const input = text.value.substring(0, selectionStart.value)
  return (
    props.source
      .filter(
        (entry) =>
          entry.toLowerCase().startsWith(input.toLowerCase()) &&
          input.toLowerCase() !== entry.toLowerCase()
      )
      // We only want the top 10 suggestions.
      .slice(0, 10)
  )
})

function updateSuggestions(event: any) {
  // Hide suggestions if ESC pressed.
  if (event.code && event.code === "Escape") {
    event.preventDefault()
    suggestionsVisible.value = false
    currentSuggestionIndex.value = -1
    return
  }

  // As suggestions is a reactive property, this implicitly
  // causes suggestions to update.
  selectionStart.value = acInput.value?.selectionStart ?? -1
  suggestionsVisible.value = true
}

const onInput = (e: Event) => {
  emit("input", (e.target as HTMLInputElement).value)
  updateSuggestions(e)
}

function forceSuggestion(suggestion: string) {
  text.value = suggestion

  selectionStart.value = text.value.length
  suggestionsVisible.value = true
  currentSuggestionIndex.value = -1

  emit("input", text.value)
}

function handleKeystroke(event: any) {
  switch (event.code) {
    case "ArrowUp":
      event.preventDefault()

      currentSuggestionIndex.value =
        currentSuggestionIndex.value - 1 >= 0
          ? currentSuggestionIndex.value - 1
          : 0
      break

    case "ArrowDown":
      event.preventDefault()

      currentSuggestionIndex.value =
        currentSuggestionIndex.value < suggestions.value.length - 1
          ? currentSuggestionIndex.value + 1
          : suggestions.value.length - 1
      break

    case "Enter":
      event.preventDefault()

      if (currentSuggestionIndex.value > -1)
        forceSuggestion(
          suggestions.value.find(
            (_item, index) => index === currentSuggestionIndex.value
          )!
        )
      break

    case "Tab": {
      event.preventDefault()

      const activeSuggestion =
        suggestions.value[
          currentSuggestionIndex.value >= 0 ? currentSuggestionIndex.value : 0
        ]

      if (!activeSuggestion) return

      forceSuggestion(activeSuggestion)
      break
    }
  }
}
</script>

<style lang="scss" scoped>
.autocomplete-wrapper {
  @apply relative;
  @apply contents;

  input:focus + ul.suggestions,
  ul.suggestions:hover {
    @apply block;
  }

  ul.suggestions {
    @apply absolute;
    @apply hidden;
    @apply bg-popover;
    @apply -left-px;
    @apply z-50;
    @apply shadow-lg;
    @apply max-h-46;
    @apply overflow-y-auto;
    @apply border-b border-x border-divider;

    top: calc(100% + 1px);
    border-radius: 0 0 8px 8px;

    li {
      @apply w-full;
      @apply block;
      @apply py-2 px-4;
      @apply text-secondary;
      @apply font-semibold;

      &:last-child {
        border-radius: 0 0 0 8px;
      }

      &:hover,
      &.active {
        @apply bg-primaryDark;
        @apply text-secondaryDark;
        @apply cursor-pointer;
      }
    }
  }
}
</style>
