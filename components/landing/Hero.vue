<template>
  <div class="flex flex-col p-6 relative md:flex-row">
    <div class="my-16 max-w-2xl z-10 relative">
      <h2
        class="
          font-semibold
          text-accent
          leading-none
          tracking-tighter
          text-4xl
          md:text-5xl
          lg:text-6xl
        "
      >
        Open Source
      </h2>
      <h3 class="my-4 text-secondaryDark text-3xl md:text-4xl lg:text-4xl">
        API Development Ecosystem
      </h3>
      <p class="my-4 text-lg">
        Thousands of developers and companies build, ship, and maintain their
        APIs on Hoppscotch — the transparent and most flexible API development
        ecosystem in the world.
      </p>
      <div class="flex space-x-4 my-8 items-center">
        <ButtonPrimary
          label="Get Started"
          icon="arrow_forward"
          rounded
          reverse
          @click.native="showLogin = true"
        />
        <ButtonSecondary
          to="https://github.com/hoppscotch/hoppscotch"
          blank
          outline
          label="GitHub"
          svg="github"
          large
          rounded
          :shortcuts="['30k']"
        />
      </div>
      <LandingStats />
    </div>
    <div class="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
      <LandingGlobe class="h-64 w-full lg:h-full sm:h-72 md:h-96" />
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      showLogin: false,
    }
  },
}
</script>
