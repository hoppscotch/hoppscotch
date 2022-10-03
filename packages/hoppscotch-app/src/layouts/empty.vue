<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in" appear>
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
