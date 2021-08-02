<template>
  <svg class="logo" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <circle class="fill-current" r="8" cx="50%" cy="50%" />
    <circle class="fill-primary" r="6" cx="50%" cy="50%" />
  </svg>
</template>

<style scoped lang="scss">
.logo {
  animation: 200ms appear;
}

@keyframes appear {
  0% {
    @apply opacity-0;
  }
  100% {
    @apply opacity-100;
  }
}
</style>
