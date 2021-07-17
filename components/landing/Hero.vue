<template>
  <div class="flex p-4 relative">
    <div class="my-16 max-w-3xl z-10 relative">
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
      <h3
        class="
          font-mono font-semibold
          my-4
          text-secondaryDark text-3xl
          md:text-4xl
          lg:text-4xl
        "
      >
        API Development Ecosystem
      </h3>
      <p class="my-4 text-lg text-secondaryLight max-w-4/5">
        Millions of developers and companies build, ship, and maintain their
        APIs on Hoppscotch — the largest and most advanced development platform
        in the world.
      </p>
      <div class="flex my-8 items-center">
        <ButtonPrimary
          label="Dashboard"
          icon="chevron_right"
          class="my-4"
          large
          reverse
        />
        <ButtonSecondary label="Dashboard" icon="chevron_right" />
        <ButtonPrimary label="GitHub" svg="github" large rounded />
        <AppGitHubStarButton size="large" />
      </div>
    </div>
    <div class="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
      <LandingGlobe class="h-64 w-full lg:h-full sm:h-72 md:h-96" />
    </div>
  </div>
</template>
