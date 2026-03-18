<template>
  <div class="flex flex-col flex-1">
    <div class="border-b border-divider bg-primary px-6 py-4">
      <div class="flex items-center space-x-8">
        <div class="w-24 h-6 bg-primaryLight rounded animate-pulse"></div>
        <div class="flex items-center gap-4">
          <div class="w-48 h-6 bg-primaryLight rounded animate-pulse"></div>
          <div class="w-12 h-6 bg-primaryLight rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    <div class="flex flex-1">
      <div
        class="w-80 border-r border-divider bg-primary p-4 space-y-6 hidden md:block"
      >
        <div class="h-8 bg-primaryLight rounded animate-pulse"></div>
        <div class="space-y-4">
          <div v-for="i in 8" :key="i" class="flex items-center space-x-3">
            <div class="w-4 h-4 bg-primaryLight rounded animate-pulse"></div>
            <div
              class="h-4 bg-primaryLight rounded animate-pulse"
              :class="i % 2 === 0 ? 'w-2/3' : 'w-3/4'"
            ></div>
          </div>
        </div>
      </div>

      <div class="flex-1 p-6 space-y-8 overflow-hidden relative">
        <div
          class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <div
            class="bg-primary px-4 py-2 shadow-sm backdrop-blur-sm flex items-center gap-3"
          >
            <div
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-secondaryLight"
            ></div>
            <span class="text-secondaryLight text-sm font-medium animate-pulse">
              Loading documentation...
            </span>
          </div>
        </div>

        <div class="space-y-4 opacity-50">
          <div
            class="h-10 bg-primaryLight rounded w-1/3 animate-pulse"
            style="animation-delay: 0.1s"
          ></div>
          <div class="space-y-2">
            <div
              class="h-4 bg-primaryLight rounded w-2/3 animate-pulse"
              style="animation-delay: 0.2s"
            ></div>
            <div
              class="h-4 bg-primaryLight rounded w-1/2 animate-pulse"
              style="animation-delay: 0.3s"
            ></div>
          </div>
        </div>

        <div class="space-y-6 opacity-50">
          <div
            v-for="i in 3"
            :key="i"
            class="border border-divider rounded-lg p-6 space-y-4"
            :style="{ animationDelay: `${0.3 + i * 0.1}s` }"
          >
            <div class="flex items-center space-x-4">
              <div
                class="w-12 h-6 bg-primaryLight rounded animate-pulse"
                :style="{ animationDelay: `${0.4 + i * 0.1}s` }"
              ></div>
              <div
                class="h-6 bg-primaryLight rounded w-1/4 animate-pulse"
                :style="{ animationDelay: `${0.5 + i * 0.1}s` }"
              ></div>
            </div>
            <div class="space-y-2">
              <div
                class="h-4 bg-primaryLight rounded w-full animate-pulse"
                :style="{ animationDelay: `${0.6 + i * 0.1}s` }"
              ></div>
              <div
                class="h-4 bg-primaryLight rounded w-5/6 animate-pulse"
                :style="{ animationDelay: `${0.7 + i * 0.1}s` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
