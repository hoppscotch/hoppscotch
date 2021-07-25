<template>
  <div
    class="
      bg-primary bg-dividerLight
      border-b border-divider
      flex
      justify-between
    "
  >
    <span class="flex">
      <SmartLink
        to="https://forms.gle/8yFiEynXB7h477Ns6"
        blank
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
        <i class="mr-4 material-icons">science</i>
        <span class="text-secondaryDark">
          <span class="md:hidden"> Beta Layout </span>
          <span class="hidden md:inline">
            You're currently viewing an experimental beta layout
          </span>
        </span>
        <span
          class="
            border-l border-divider
            flex
            font-semibold
            text-accent
            ml-4
            pl-4
            transition
            items-center
            justify-center
            group-hover:text-accentDark
          "
        >
          <span class="md:hidden"> Give Feedback </span>
          <span class="hidden md:inline"> Report a problem </span>
        </span>
      </SmartLink>
      <SmartLink
        to="https://hoppscotch.io"
        class="flex transition items-center justify-center group"
      >
        <span class="text-secondaryDark">
          Switch back to the Hoppscotch website
        </span>
      </SmartLink>
    </span>
    <ButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      icon="close"
      :title="$t('close')"
    />
  </div>
</template>
