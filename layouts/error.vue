<template>
  <div class="page page-error">
    <img src="~static/icons/error.svg" :alt="$t('error')" class="error_banner" />
    <h2>{{ error.statusCode }}</h2>
    <h3>{{ error.message }}</h3>
    <p>
      <nuxt-link to="/">
        <button>{{ $t("go_home") }}</button>
      </nuxt-link>
    </p>
    <p>
      <a href @click.prevent="reloadApplication">{{ $t("reload") }}</a>
    </p>
  </div>
</template>

<style scoped lang="scss">
// Center the error page in the viewport.
.page-error {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.error_banner {
  width: 256px;
}
</style>

<script>
export default {
  props: ["error"],

  methods: {
    reloadApplication() {
      this.$router.push("/", () => window.location.reload());
    }
  },

  head() {
    return {
      bodyAttrs: {
        class: "sticky-footer"
      }
    };
  }
};
</script>
