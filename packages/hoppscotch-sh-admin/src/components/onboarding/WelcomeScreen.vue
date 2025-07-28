<template>
  <div class="flex flex-1 justify-center items-center">
    <div class="max-w-screen-md mx-auto p-8 flex flex-col space-y-4">
      <div class="flex flex-col space-y-2 mb-4">
        <img src="/logo.svg" alt="hoppscotch-logo" class="w-20 mb-4" />
        <h1 class="text-3xl font-bold text-secondaryDark">Welcome</h1>
        <h2 class="mt-3">
          This is the onboarding process for setting up your Hoppscotch
          instance.
        </h2>
        <p class="text-secondaryLight">
          Please set up either SMTP or OAuth for authentication.
        </p>
      </div>
      <HoppButtonPrimary label="Start Onboarding" @click="$emit('next')" />
    </div>
  </div>
</template>
