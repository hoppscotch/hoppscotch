<template>
  <div
    tabindex="0"
    class="relative flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring focus-visible:ring-primaryDark"
    :class="[`rounded-${rounded}`, `w-${size} h-${size}`]"
  >
    <img
      v-if="url"
      class="absolute object-cover object-center transition bg-primaryDark"
      :class="[`rounded-${rounded}`, `w-${size} h-${size}`]"
      :src="url"
      :alt="alt"
      loading="lazy"
      referrerpolicy="no-referrer"
    />
    <div
      v-else
      class="absolute flex items-center justify-center object-cover object-center transition bg-primaryDark text-accentContrast"
      :class="[`rounded-${rounded}`, `w-${size} h-${size}`]"
      :style="`background-color: ${initial ? toHex(initial) : '#480000'}`"
    >
      <template v-if="initial && initial.charAt(0).toUpperCase()">
        {{ initial.charAt(0).toUpperCase() }}
      </template>
      <icon-lucide-user v-else />
    </div>
    <span
      v-if="indicator"
      class="border-primary border-2 h-2.5 -top-0.5 -right-0.5 w-2.5 absolute"
      :class="[`rounded-${rounded}`, indicatorStyles]"
    ></span>
    <!-- w-5 h-5 rounded-lg -->
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    url: string
    alt: string
    indicator: boolean
    indicatorStyles: string
    rounded: string
    size: string
    initial: string | undefined | null
  }>(),
  {
    url: "",
    alt: "Profile picture",
    indicator: false,
    indicatorStyles: "bg-green-500",
    rounded: "full",
    size: "5",
    initial: "",
  }
)

const toHex = (initial: string) => {
  let hash = 0
  if (initial.length === 0) return hash
  for (let i = 0; i < initial.length; i++) {
    hash = initial.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  let color = "#"
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 255
    color += `00${value.toString(16)}`.slice(-2)
  }
  return color
}
</script>
