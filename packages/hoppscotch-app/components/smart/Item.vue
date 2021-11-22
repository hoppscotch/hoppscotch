<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      rounded
      transition
      flex-shrink-0
      py-2
      px-4
      inline-flex
      items-center
      hover:bg-primaryDark hover:text-secondaryDark
      focus:outline-none
      focus-visible:bg-primaryDark focus-visible:text-secondaryDark
    "
    :class="[
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'pointer-events-none': loading },
      { 'flex-1': label },
      { 'flex-row-reverse justify-end': reverse },
      {
        'border border-divider hover:border-dividerDark focus-visible:border-dividerDark':
          outline,
      },
    ]"
    :disabled="disabled"
    :tabindex="loading ? '-1' : '0'"
  >
    <span
      v-if="!loading"
      class="inline-flex items-center"
      :class="{ 'self-start': infoIcon }"
    >
      <i
        v-if="icon"
        :class="[
          label ? (reverse ? 'ml-4 opacity-75' : 'mr-4 opacity-75') : '',
          { 'text-accent': active },
        ]"
        class="material-icons"
      >
        {{ icon }}
      </i>
      <SmartIcon
        v-if="svg"
        :name="svg"
        :class="[
          label ? (reverse ? 'ml-4 opacity-75' : 'mr-4 opacity-75') : '',
          { 'text-accent': active },
        ]"
        class="svg-icons"
      />
    </span>
    <SmartSpinner v-else class="mr-4 text-secondaryDark" />
    <div
      class="flex-1 inline-flex truncate items-start"
      :class="{ 'flex-col': description }"
    >
      <div class="truncate font-semibold">
        {{ label }}
      </div>
      <p
        v-if="description"
        class="my-2 font-medium text-left text-secondaryLight"
      >
        {{ description }}
      </p>
    </div>
    <i
      v-if="infoIcon"
      class="ml-6 self-center material-icons items-center"
      :class="{ 'text-accent': activeInfoIcon }"
    >
      {{ infoIcon }}
    </i>
  </SmartLink>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    to: {
      type: String,
      default: "",
    },
    exact: {
      type: Boolean,
      default: true,
    },
    blank: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    svg: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    reverse: {
      type: Boolean,
      default: false,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
    activeInfoIcon: {
      type: Boolean,
      default: false,
    },
    infoIcon: {
      type: String,
      default: "",
    },
  },
})
</script>
