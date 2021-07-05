<template>
  <transition name="fade" appear>
    <GithubButton
      title="Star Hoppscotch"
      href="https://github.com/hoppscotch/hoppscotch"
      :data-color-scheme="
        $colorMode.value != 'light'
          ? $colorMode.value == 'black'
            ? 'dark'
            : 'dark_dimmed'
          : 'light'
      "
      :data-show-count="true"
      data-text="Star"
      aria-label="Star Hoppscotch on GitHub"
      data-size="large"
    />
  </transition>
</template>

<script>
import GithubButton from "vue-github-button"

export default {
  components: {
    GithubButton,
  },
}
</script>
