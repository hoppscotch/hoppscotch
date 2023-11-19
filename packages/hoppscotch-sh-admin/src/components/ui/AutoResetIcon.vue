<template>
  <HoppButtonSecondary
    v-tippy="{ theme: 'tooltip' }"
    :title="title"
    :icon="icon"
    :color="icon === props.icon.default ? props.color : props.resetColor"
    class="px-3"
    @click="iconClicked"
  />
</template>

<script setup lang="ts">
import { FunctionalComponent, SVGAttributes } from 'vue';
import { refAutoReset } from '@vueuse/core';

const props = withDefaults(
  defineProps<{
    title: string;
    color?: string;
    // color to be displayed temporarily until reset
    resetColor?: string;
    icon: {
      default: FunctionalComponent<SVGAttributes, {}>;
      // icon to be displayed temporarily until reset
      temporary: FunctionalComponent<SVGAttributes, {}>;
    };
  }>(),
  {
    color: 'white',
    resetColor: 'green',
  }
);

const emit = defineEmits<{
  (e: 'icon-clicked'): void;
}>();

const iconClicked = () => {
  icon.value = props.icon.temporary;
  emit('icon-clicked');
};

const icon = refAutoReset<FunctionalComponent<SVGAttributes, {}>>(
  props.icon.default,
  1000
);
</script>
