<template>
  <div class="flex flex-col">
    <header
      class="flex items-center justify-between flex-1 flex-shrink-0 px-2 py-2 space-x-2 overflow-x-auto overflow-y-hidden"
    >
      <div class="flex items-center justify-between flex-1 space-x-2">
        <HoppButtonSecondary
          class="!font-bold uppercase tracking-wide !text-secondaryDark hover:bg-primaryDark focus-visible:bg-primaryDark"
          :label="t('app.name')"
          to="https://hoppscotch.io"
          blank
        />
        <div class="flex">
          <HoppButtonSecondary
            :label="t('app.open_in_hoppscotch')"
            :to="sharedRequestURL"
            blank
          />
        </div>
      </div>
    </header>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "~/composables/i18n"

const t = useI18n()

defineProps<{
  sharedRequestURL: string
}>()
</script>
