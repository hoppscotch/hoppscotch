<template>
  <div class="space-x-2">
    <span
      v-for="(color, index) of colors"
      :key="`color-${index}`"
      v-tooltip="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
      class="inline-flex items-center justify-center p-3 m-2 transition duration-200 ease-in-out bg-transparent rounded-full cursor-pointer border-collapseer-2 hover:shadow-none"
      :class="[{ 'bg-bgDarkColor': color === active }, `text-${color}-400`]"
      @click="active = color"
    >
      <i class="material-icons">lens</i>
    </span>
  </div>
</template>

<script>
export default {
  data() {
    return {
      active: "green",
      colors: ["blue", "green", "teal", "purple", "orange", "pink", "red", "yellow"],
    }
  },
}
</script>
