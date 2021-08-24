<template>
  <div class="flex flex-col p-6 relative">
    <div class="flex flex-col mt-16 items-center justify-center">
      <h2
        class="
          text-accent text-center
          leading-none
          tracking-tighter
          text-4xl
          md:text-6xl
          lg:text-8xl
        "
      >
        Open Source
      </h2>
      <h3
        class="
          my-4
          text-center text-secondaryDark
          leading-none
          tracking-tighter
          text-3xl
          md:text-4xl
          lg:text-5xl
        "
      >
        API Development Ecosystem
      </h3>
      <p class="my-4 text-lg text-center max-w-2xl">
        Thousands of developers and companies build, ship, and maintain their
        APIs on Hoppscotch — the transparent and most flexible API development
        ecosystem in the world.
      </p>
      <div class="flex space-x-4 my-8 justify-center items-center">
        <ButtonPrimary
          label="Get Started"
          icon="arrow_forward"
          rounded
          reverse
          large
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
          :shortcut="['30k Stars']"
        />
      </div>
      <!-- <LandingStats /> -->
    </div>
    <div class="flex flex-col items-center justify-center"></div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  data() {
    return {
      showLogin: false,
    }
  },
})
</script>
