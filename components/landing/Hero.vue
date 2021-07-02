<template>
  <div class="flex p-4 relative overflow-hidden">
    <div class="relative my-16 z-10 max-w-3xl">
      <h2
        class="
          leading-none
          tracking-tighter
          font-semibold
          text-accent text-5xl
          md:text-6xl
          lg:text-8xl
        "
      >
        Open Source
      </h2>
      <h3
        class="
          text-3xl
          my-8
          font-mono
          text-secondaryDark
          md:text-4xl
          lg:text-4xl
          font-semibold
        "
      >
        API Development Ecosystem
      </h3>
      <p class="text-lg my-4 text-secondaryLight max-w-4/5">
        Millions of developers and companies build, ship, and maintain their
        APIs on Hoppscotch — the largest and most advanced development platform
        in the world.
      </p>
      <div class="my-8 flex items-center">
        <button class="button rounded text-xl">Get Started</button>
      </div>
    </div>
    <div class="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
      <LandingGlobe class="h-64 w-full sm:h-72 md:h-96 lg:w-full lg:h-full" />
    </div>
  </div>
</template>
