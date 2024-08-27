<template>
  <div>
    <div class="drawer" :class="{ 'is-open': isOpen, 'is-visible': isVisible }">
      <div
        class="drawer__overlay"
        :style="{ transitionDuration: `${speed}ms` }"
      ></div>
      <div
        class="drawer__content"
        v-click-away="closeDrawer"
        :style="{
          maxWidth: maxWidth,
          transitionDuration: `${speed}ms`,
          backgroundColor: backgroundColor,
        }"
      >
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toRefs, watch } from "vue"

const props = defineProps<{
  isOpen: boolean
  maxWidth: string
  speed: number
  backgroundColor: string
}>()

const emit = defineEmits(["close"])

const toggleBackgroundScrolling = (enable: boolean) => {
  const body = document.querySelector("body")

  body.style.overflow = enable ? "hidden" : null
}

const closeDrawer = () => {
  console.log("closeDrawer")
  if (!isTransitioning.value) {
    emit("close")
  }
}

const { isOpen, maxWidth, speed, backgroundColor } = toRefs(props)

const isVisible = ref(false)
const isTransitioning = ref(false)

watch(isOpen, (val) => {
  isTransitioning.value = true

  if (val) {
    toggleBackgroundScrolling(true)
    isVisible.value = true
  } else {
    toggleBackgroundScrolling(false)
    setTimeout(() => (isVisible.value = false), speed.value)
  }

  setTimeout(() => (isTransitioning.value = false), speed.value)
})

onMounted(() => {
  isVisible.value = isOpen.value
})
</script>

<style lang="scss" scoped>
.drawer {
  visibility: hidden;

  &.is-visible {
    visibility: visible;
  }

  &.is-open {
    .drawer__overlay {
      opacity: 0.5;
    }

    .drawer__content {
      transform: translateX(0);
    }
  }

  &__overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 200;
    opacity: 0;
    transition-property: opacity;
    background-color: #000000;
    user-select: none;
  }

  &__content {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
    z-index: 9999;
    overflow: auto;
    transition-property: transform;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    box-shadow: 0 2px 6px #777;
  }
}
</style>
