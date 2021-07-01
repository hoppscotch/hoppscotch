<template>
  <div class="flex p-4 justify-between">
    <div class="max-w-md">
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
        <button class="button rounded-2xl text-xl">Get Started</button>
        <button class="button icon rounded-2xl text-xl">Login</button>
        <AppGitHubStarButton class="ml-8" />
      </div>
    </div>
    <AppGlobe />
  </div>
</template>
