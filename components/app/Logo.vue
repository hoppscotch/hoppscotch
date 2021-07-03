<template>
  <svg class="logo" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <linearGradient
      id="a"
      gradientTransform="matrix(1 0 0 -1 0 -24914)"
      gradientUnits="userSpaceOnUse"
      x1="0"
      x2="512"
      y1="-25170"
      y2="-25170"
    >
      <stop offset="0" stop-color="#31d8ff" />
      <stop offset="1" stop-color="#ff80ff" />
    </linearGradient>
    <path
      d="M512 256c0 141.387-114.613 256-256 256S0 397.387 0 256 114.613 0 256 0s256 114.613 256 256zm0 0"
      fill="url(#a)"
    />
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
