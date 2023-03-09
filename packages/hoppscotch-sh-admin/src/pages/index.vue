<template>
  <div
    class="flex items-center justify-center h-screen bg-gray-200 dark:bg-gradient-to-r dark:from-zinc-700 dark:to-gray-900 p-6"
  >
    <div>
      <div class="flex flex-col items-center justify-center mb-10">
        <HoppButtonSecondary
          class="tracking-wide !font-bold !text-secondaryDark hover:bg-primaryDark focus-visible:bg-primaryDark uppercase"
          :label="'Hoppscotch'"
          to="/"
        />
        <span> Dashboard </span>
      </div>
      <div
        class="bg-primary xs:w-xs sm:w-sm md:w-lg p-10 rounded-md border border-secondaryLight"
      >
        <AppLogin />
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: empty
</route>
