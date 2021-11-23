<template>
  <div class="relative flex items-center justify-center w-5 h-5 cursor-pointer">
    <img
      class="
        object-cover
        bg-primaryDark
        absolute
        object-center
        w-5
        h-5
        transition
        rounded-full
      "
      :src="url"
      :alt="alt"
      loading="lazy"
    />
    <div class="absolute inset-0 rounded-full shadow-inner"></div>
    <span
      v-if="indicator"
      class="
        border-primary
        rounded-full
        border-2
        h-2.5
        -top-0.5
        -right-0.5
        w-2.5
        absolute
      "
      :class="indicatorStyles"
    ></span>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    url: {
      type: String,
      default: `https://avatars.dicebear.com/v2/avataaars/${Math.random()
        .toString(36)
        .substring(7)}.svg?mood[]=happy`,
    },
    alt: {
      type: String,
      default: "Profile picture",
    },
    indicator: {
      type: Boolean,
      default: false,
    },
    indicatorStyles: {
      type: String,
      default: "bg-green-500",
    },
  },
})
</script>
