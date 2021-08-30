<template>
  <div key="outputHash">
    <AppSearchEntry
      v-for="(shortcut, shortcutIndex) in searchResults"
      :key="`shortcut-${shortcutIndex}`"
      :ref="`item-${shortcutIndex}`"
      :shortcut="shortcut"
      @action="$emit('action', shortcut.action)"
    />
    <div
      v-if="searchResults.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">manage_search</i>
      <span class="text-center">
        {{ $t("state.nothing_found") }} "{{ search }}"
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "@nuxtjs/composition-api"
import lunr from "lunr"

const props = defineProps<{
  input: Record<string, any>[]
  search: string
}>()

const transformedInput = computed(() =>
  props.input.map((val, i) => {
    return {
      __id: i,
      ...val,
    }
  })
)

const firstInput = computed(() =>
  transformedInput.value.length > 0 ? transformedInput.value[0] : {}
)

const idx = computed(() => {
  return lunr(function () {
    this.ref("__id")

    Object.keys(firstInput.value).forEach((key) => this.field(key), this)

    transformedInput.value.forEach((doc) => {
      this.add(doc)
    }, this)
  })
})

const searchResults = computed(() =>
  idx.value.search(`${props.search}*`).map((result) => props.input[+result.ref])
)
</script>
