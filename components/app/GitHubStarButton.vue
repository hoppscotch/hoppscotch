<template>
  <TranslateFade appear>
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
  </TranslateFade>
</template>

<script>
import GithubButton from "vue-github-button"

export default {
  components: {
    GithubButton,
  },
}
</script>
