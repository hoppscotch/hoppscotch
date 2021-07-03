<template>
  <div
    class="relative flex items-center justify-center"
    :class="`h-${size} w-${size}`"
  >
    <img
      class="
        absolute
        object-cover object-center
        transition
        rounded-lg
        bg-primaryDark
      "
      :class="`h-${size} w-${size} bg-${color}`"
      :src="url"
      :alt="alt"
      loading="lazy"
    />
    <div class="absolute inset-0 rounded-lg shadow-inner"></div>
  </div>
</template>

<script>
export default {
  props: {
    url: {
      type: String,
      default: `https://avatars.dicebear.com/v2/avataaars/${Math.random()
        .toString(36)
        .substring(7)}.svg?mood[]=happy`,
    },
    size: {
      type: Number,
      default: 6,
    },
    radius: {
      type: String,
      default: "md",
    },
    color: {
      type: String,
      default: "gray",
    },
    alt: {
      type: String,
      default: "Profile picture",
      // default() {
      //   return this.url
      //     .split('/')
      //     .pop()
      //     .split('.')[0]
      //     .split('#')[0]
      //     .split('?')[0]
      // },
    },
  },
}
</script>
