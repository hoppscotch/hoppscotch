<template>
  <div class="flex flex-col px-4">
    <div v-if="isInitialPageLoad" class="flex flex-col items-center py-3">
      <HoppSmartSpinner />
    </div>

    <div
      v-else-if="initialPageLoadHasError"
      class="flex flex-col items-center py-4"
    >
      <icon-lucide-help-circle class="mb-4 svg-icons" />
      {{ t('state.something_went_wrong') }}
    </div>

    <HoppSmartPlaceholder
      v-else-if="infraTokens.length === 0"
      :src="noTokensImage"
      :alt="`${t('infra_tokens.empty')}`"
      :text="t('infra_tokens.empty')"
      @drop.stop
    />

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="{ id, label, lastUsedOn, expiresOn } in infraTokens"
        :key="id"
        class="flex flex-col items-center gap-4 p-4 border rounded border-divider"
      >
        <div class="w-full text-sm font-semibold truncate text-secondaryDark">
          {{ label }}
        </div>

        <div class="flex items-center justify-between w-full gap-x-4">
          <div class="space-y-1 text-secondaryLight">
            <div class="space-x-1">
              <span class="font-semibold"
                >{{ t('infra_tokens.last_used_on') }}:</span
              >
              <span>
                {{ shortDateTime(lastUsedOn, false) }}
              </span>
            </div>

            <div class="space-x-1">
              <span class="font-semibold"
                >{{ t('infra_tokens.expires_on') }}:</span
              >
              <span>
                {{ getTokenExpiryText(expiresOn) }}
              </span>
            </div>
          </div>

          <HoppButtonSecondary
            :label="t('action.delete')"
            filled
            outline
            @click="
              emit('delete-infra-token', {
                tokenId: id,
                tokenLabel: label,
              })
            "
          />
        </div>
      </div>
    </div>

    <HoppSmartIntersection
      v-if="hasMoreTokens"
      @intersecting="emit('fetch-more-tokens')"
    >
      <div v-if="loading" class="flex flex-col items-center py-3">
        <HoppSmartSpinner />
      </div>

      <div v-else-if="hasError" class="flex flex-col items-center py-4">
        <icon-lucide-help-circle class="mb-4 svg-icons" />
        {{ t('state.something_went_wrong') }}
      </div>
    </HoppSmartIntersection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';

import { InfraTokensQuery } from '~/helpers/backend/graphql';
import { shortDateTime } from '~/helpers/utils/date';

const t = useI18n();

const props = defineProps<{
  infraTokens: InfraTokensQuery['infraTokens'];
  hasMoreTokens: boolean;
  loading: boolean;
  hasError: boolean;
}>();

const emit = defineEmits<{
  (e: 'fetch-more-tokens'): void;
  (
    e: 'delete-infra-token',
    { tokenId, tokenLabel }: { tokenId: string; tokenLabel: string }
  ): void;
}>();

const noTokensImage = `${import.meta.env.VITE_ADMIN_URL}/images/pack.svg`;

const isInitialPageLoad = computed(() => props.loading && !props.hasMoreTokens);
const initialPageLoadHasError = computed(
  () => props.hasError && !props.hasMoreTokens
);

const getTokenExpiryText = (tokenExpiresOn: string | null) => {
  if (!tokenExpiresOn) {
    return t('infra_tokens.no_expiration');
  }

  const isTokenExpired =
    new Date(tokenExpiresOn).toISOString() > tokenExpiresOn;

  return isTokenExpired
    ? t('infra_tokens.expired')
    : shortDateTime(tokenExpiresOn, false);
};
</script>
