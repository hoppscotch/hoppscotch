<template>
  <div class="flex bg-primary border-b border-dividerLight">
    <SmartLink
      to="https://forms.gle/8yFiEynXB7h477Ns6"
      blank
      class="
        relative
        flex
        items-center
        justify-center
        px-4
        py-3
        transition
        group
      "
    >
      <i class="material-icons mr-4">science</i>
      <span class="text-secondaryDark text-xs">
        <span class="md:hidden"> Beta Layout </span>
        <span class="hidden md:inline">
          You're currently viewing experimental beta layout
        </span>
      </span>
      <span
        class="
          flex
          items-center
          justify-center
          pl-4
          ml-4
          font-semibold
          transition
          border-l
          group-hover:text-accentDark
          border-divider
          text-accent text-xs
        "
      >
        <span class="md:hidden"> Give Feedback </span>
        <span class="hidden md:inline"> Report a problem </span>
      </span>
    </SmartLink>
  </div>
</template>
