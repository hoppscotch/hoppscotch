<template>
  <div class="page page-error">
    <h1>{{ error.statusCode }}</h1>
    <h2>{{ error.message }}</h2>
    <br>
    <p><nuxt-link to="/"><button>Go Home</button></nuxt-link></p>
    <p><a href="/">Reload</a></p>
  </div>
</template>

<style lang="scss">
  // Center the error page in the viewport.
  .page-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;

    text-align: center;
  }
</style>

<script>
  export default {
      props: ['error'],
      head () {
          return {
              bodyAttrs: {
                  class: 'sticky-footer'
              }
          }
      }
  }
</script>
