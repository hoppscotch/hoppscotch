<template>
  <tippy
    interactive
    trigger="click"
    theme="popover"
    :on-shown="() => actions?.focus()"
  >
    <HoppSmartSelectWrapper>
      <input
        :value="label(modelValue)"
        readonly
        class="flex flex-1 w-full pl-4 pr-8 py-2 bg-transparent border rounded cursor-pointer border-divider"
      />
    </HoppSmartSelectWrapper>

    <template #content="{ hide }">
      <div
        ref="actions"
        tabindex="0"
        role="menu"
        class="flex flex-col focus:outline-none"
        @keyup.escape="hide"
      >
        <HoppSmartItem
          v-for="choice in CHOICES"
          :key="String(choice)"
          :label="label(choice)"
          :icon="choice === modelValue ? IconCircleDot : IconCircle"
          :active="choice === modelValue"
          :aria-selected="choice === modelValue"
          @click="
            () => {
              emit('update:modelValue', choice);
              hide();
            }
          "
        />
      </div>
    </template>
  </tippy>
</template>

<script setup lang="ts">
import { VNodeRef, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import IconCircle from '~icons/lucide/circle';
import IconCircleDot from '~icons/lucide/circle-dot';

const t = useI18n();

defineProps<{ modelValue: boolean | null }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean | null): void;
}>();

const actions = ref<VNodeRef | null>(null);

/**
 * Null is the default and is NOT the same as false: presets declare their own
 * capabilities, and only an explicit choice should overrule that.
 */
const CHOICES: (boolean | null)[] = [null, true, false];

const label = (value: boolean | null) =>
  value === null
    ? t('ai_providers.override_follow_provider')
    : value
      ? t('ai_providers.override_force_on')
      : t('ai_providers.override_force_off');
</script>
