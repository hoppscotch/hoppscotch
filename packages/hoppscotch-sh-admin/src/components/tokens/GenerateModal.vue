<template>
  <HoppSmartModal
    dialog
    :title="t('infra_tokens.generate_modal_title')"
    @close="hideModal"
  >
    <template #body>
      <template v-if="infraToken">
        <p class="p-4 mb-4 border rounded-md text-amber-500 border-amber-600">
          {{ t('infra_tokens.copy_token_warning') }}
        </p>

        <div
          class="flex items-center justify-between p-4 mt-4 rounded-md bg-primaryLight"
        >
          <div class="text-secondaryDark">{{ infraToken }}</div>
          <HoppButtonSecondary
            outline
            filled
            :icon="copyIcon"
            @click="copyInfraToken"
          />
        </div>
      </template>

      <div v-else class="space-y-4">
        <div class="space-y-2">
          <div class="font-semibold text-secondaryDark">
            {{ t('action.label') }}
          </div>
          <HoppSmartInput
            v-model="infraTokenLabel"
            :placeholder="t('infra_tokens.token_purpose')"
          />
        </div>

        <div class="space-y-2">
          <label for="expiration" class="font-semibold text-secondaryDark">{{
            t('infra_tokens.expiration_label')
          }}</label>

          <div class="grid items-center grid-cols-2 gap-x-2">
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions?.focus()"
            >
              <HoppSmartSelectWrapper>
                <input
                  id="expiration"
                  :value="expiration"
                  readonly
                  class="flex flex-1 px-4 py-2 bg-transparent border rounded cursor-pointer border-divider"
                />
              </HoppSmartSelectWrapper>

              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  tabindex="0"
                  role="menu"
                  class="flex flex-col focus:outline-none"
                  @keyup.escape="hide"
                >
                  <HoppSmartItem
                    v-for="expirationOption in Object.keys(expirationOptions)"
                    :key="expirationOption"
                    :label="expirationOption"
                    :icon="
                      expirationOption === expiration
                        ? IconCircleDot
                        : IconCircle
                    "
                    :active="expirationOption === expiration"
                    :aria-selected="expirationOption === expiration"
                    @click="
                      () => {
                        expiration = expirationOption;
                        hide();
                      }
                    "
                  />
                </div>
              </template>
            </tippy>

            <span class="text-secondaryLight">{{ expirationDateText }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <HoppButtonSecondary
        v-if="infraToken"
        :label="t('action.close')"
        outline
        filled
        @click="hideModal"
      />

      <div v-else class="flex items-center gap-x-2">
        <HoppButtonPrimary
          :loading="tokenGenerateActionLoading"
          filled
          outline
          :label="t('infra_tokens.generate_token')"
          @click="generateInfraToken"
        />

        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { refAutoReset } from '@vueuse/core';
import { VNodeRef, computed, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';

import { copyToClipboard } from '~/helpers/utils/clipboard';
import { shortDateTime } from '~/helpers/utils/date';

import IconCheck from '~icons/lucide/check';
import IconCircle from '~icons/lucide/circle';
import IconCircleDot from '~icons/lucide/circle-dot';
import IconCopy from '~icons/lucide/copy';

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  tokenGenerateActionLoading: boolean;
  infraToken: string | null;
}>();

const emit = defineEmits<{
  (e: 'hide-modal'): void;
  (
    e: 'generate-infra-token',
    { label, expiryInDays }: { label: string; expiryInDays: number | null }
  ): void;
}>();

// Template refs
const tippyActions = ref<VNodeRef | null>(null);

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
);

const infraTokenLabel = ref<string>('');
const expiration = ref<string>('30 days');

const expirationOptions: Record<string, number | null> = {
  '7 days': 7,
  '30 days': 30,
  '60 days': 60,
  '90 days': 90,
  'No expiration': null,
};

const expirationDateText = computed(() => {
  const chosenExpiryInDays = expirationOptions[expiration.value];

  if (chosenExpiryInDays === null) {
    return t('infra_tokens.no_expiration_verbose');
  }

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + chosenExpiryInDays);

  const expirationDate = shortDateTime(currentDate, false);
  return `${t('infra_tokens.token_expires_on')} ${expirationDate}`;
});

const copyInfraToken = () => {
  if (!props.infraToken) {
    toast.error('state.something_went_wrong');
    return;
  }

  copyToClipboard(props.infraToken);
  copyIcon.value = IconCheck;

  toast.success(t('state.copied_to_clipboard'));
};

const generateInfraToken = async () => {
  if (!infraTokenLabel.value) {
    toast.error(t('infra_tokens.invalid_label'));
    return;
  }

  emit('generate-infra-token', {
    label: infraTokenLabel.value,
    expiryInDays: expirationOptions[expiration.value],
  });
};

const hideModal = () => emit('hide-modal');
</script>
