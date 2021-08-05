<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      rounded
      font-semibold
      py-2
      px-4
      transition
      inline-flex
      items-center
      hover:(bg-primaryDark
      text-secondaryDark)
      focus:(bg-primaryDark
      outline-none
      text-secondaryDark)
    "
    :class="[
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'pointer-events-none': loading },
      { 'flex-1': label },
      { 'flex-row-reverse justify-end': reverse },
      {
        'border border-divider hover:border-dividerDark focus:border-dividerDark':
          outline,
      },
    ]"
    :disabled="disabled"
    :tabindex="loading ? '-1' : '0'"
  >
    <span v-if="!loading" class="inline-flex items-center">
      <i
        v-if="icon"
        :class="label ? (reverse ? 'ml-4 opacity-75' : 'mr-4 opacity-75') : ''"
        class="material-icons"
      >
        {{ icon }}
      </i>
      <SmartIcon
        v-if="svg"
        :name="svg"
        :class="label ? (reverse ? 'ml-4 opacity-75' : 'mr-4 opacity-75') : ''"
        class="svg-icons"
      />
    </span>
    <SmartSpinner v-else class="mr-4" />
    <div
      class="flex-1 inline-flex items-start"
      :class="{ 'flex-col': description }"
    >
      <div class="font-semibold">
        {{ label }}
      </div>
      <p v-if="description" class="my-2 text-left text-secondaryLight">
        {{ description }}
      </p>
    </div>
    <i v-if="infoIcon" class="text-accent ml-6 self-end material-icons">
      {{ infoIcon }}
    </i>
  </SmartLink>
</template>

<script>
export default {
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
    infoIcon: {
      type: String,
      default: "",
    },
  },
}
</script>
