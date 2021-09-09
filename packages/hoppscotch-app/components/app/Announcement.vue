<template>
  <div class="bg-error flex justify-between">
    <span
      class="
        flex
        py-2
        px-4
        transition
        relative
        items-center
        justify-center
        group
      "
    >
      <i class="mr-2 material-icons">info_outline</i>
      <span class="text-secondaryDark">
        <span class="md:hidden">
          {{ $t("helpers.offline_short") }}
        </span>
        <span class="hidden md:inline">
          {{ $t("helpers.offline") }}
        </span>
      </span>
    </span>
  </div>
</template>
