<template>
  <div class="flex flex-col p-4">
    <div class="flex flex-col items-center">
      <p
        class="mt-4 mb-8 font-semibold tracking-widest text-center text-accent"
      >
        EMPOWERING CREATORS
      </p>
    </div>
    <div class="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6">
      <div
        v-for="(user, index) in 12"
        :key="`user-${index}`"
        class="inline-flex flex-col items-center justify-center p-4"
      >
        <img
          :src="`https://i.pravatar.cc/${Math.floor(
            Math.random() * (600 - 400 + 1) + 400
          )}`"
          alt="Profile picture"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center h-24 w-24"
        />
      </div>
    </div>
  </div>
</template>
