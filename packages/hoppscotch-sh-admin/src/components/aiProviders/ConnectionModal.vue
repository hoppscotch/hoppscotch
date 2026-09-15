<template>
  <HoppSmartModal
    dialog
    :title="
      isEditing
        ? t('ai_providers.edit_modal_title')
        : t('ai_providers.generate_modal_title')
    "
    @close="hideModal"
  >
    <template #body>
      <div class="space-y-4">
        <!-- The two switches that decide whether this connection is used at all
             sit above the fields, so their state is read before anything is
             edited rather than found after scrolling past the form. -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <HoppSmartToggle
            :on="enabled"
            role="switch"
            :aria-checked="enabled ? 'true' : 'false'"
            @change="enabled = !enabled"
            @keydown.space.prevent="enabled = !enabled"
          >
            {{ t('ai_providers.enabled') }}
          </HoppSmartToggle>

          <HoppSmartToggle
            :on="isDefault"
            role="switch"
            :aria-checked="isDefault ? 'true' : 'false'"
            @change="isDefault = !isDefault"
            @keydown.space.prevent="isDefault = !isDefault"
          >
            {{ t('ai_providers.is_default') }}
          </HoppSmartToggle>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-secondaryDark">
            {{ t('ai_providers.label') }}
          </label>
          <HoppSmartInput
            v-model="label"
            :placeholder="t('ai_providers.label_placeholder')"
          />
        </div>

        <div class="space-y-2">
          <label for="preset" class="font-semibold text-secondaryDark">
            {{ t('ai_providers.preset') }}
          </label>

          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => presetActions?.focus()"
          >
            <HoppSmartSelectWrapper>
              <div
                class="flex flex-1 w-full items-center gap-2 px-4 py-2 bg-transparent border rounded cursor-pointer border-divider"
              >
                <component
                  :is="logoForPreset(preset)"
                  class="h-4 w-4 shrink-0 text-secondaryDark"
                  aria-hidden="true"
                />
                <input
                  id="preset"
                  :value="labelForPreset(preset)"
                  readonly
                  class="min-w-0 flex-1 bg-transparent cursor-pointer focus:outline-none"
                />
              </div>
            </HoppSmartSelectWrapper>

            <template #content="{ hide }">
              <div
                ref="presetActions"
                tabindex="0"
                role="menu"
                class="flex flex-col focus:outline-none"
                @keyup.escape="hide"
              >
                <HoppSmartItem
                  v-for="option in presets"
                  :key="option.name"
                  :label="labelForPreset(option.name)"
                  :icon="logoForPreset(option.name)"
                  :active="option.name === preset"
                  :aria-selected="option.name === preset"
                  @click="
                    () => {
                      preset = option.name;
                      hide();
                    }
                  "
                />
              </div>
            </template>
          </tippy>

          <p
            v-if="selectedPreset && !selectedPreset.verified"
            class="text-tiny text-secondaryLight"
          >
            {{ t('ai_providers.unverified') }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-secondaryDark">
            {{ t('ai_providers.base_url') }}
            <span
              v-if="!baseURLRequired"
              class="font-normal text-secondaryLight"
            >
              ({{ t('ai_providers.optional') }})
            </span>
          </label>
          <HoppSmartInput v-model="baseURL" :placeholder="baseURLPlaceholder" />
          <p
            v-if="!baseURLRequired && selectedPreset?.defaultBaseURL"
            class="text-tiny text-secondaryLight"
          >
            {{
              t('ai_providers.base_url_default', {
                url: selectedPreset.defaultBaseURL,
              })
            }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-secondaryDark">
            {{ t('ai_providers.api_key') }}
          </label>
          <HoppSmartInput
            v-model="apiKey"
            :placeholder="
              isEditing
                ? t('ai_providers.api_key_keep')
                : t('ai_providers.api_key_placeholder')
            "
            :type="maskKey ? 'password' : 'text'"
            class="border rounded border-divider"
            input-styles="!border-0"
          >
            <template #button>
              <HoppButtonSecondary
                :icon="maskKey ? IconEye : IconEyeOff"
                class="rounded bg-primaryLight"
                @click="maskKey = !maskKey"
              />
            </template>
          </HoppSmartInput>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-secondaryDark">
            {{ t('ai_providers.models') }}
          </label>

          <!-- Starting points, not a catalogue: vendors add and retire ids
               constantly, so the field below stays the way in for anything
               this build has not heard of. -->
          <div
            v-if="selectedPreset?.suggestedModels.length"
            class="flex flex-wrap gap-1.5"
          >
            <button
              v-for="suggestion in selectedPreset.suggestedModels"
              :key="suggestion"
              type="button"
              class="rounded-full border px-2.5 py-1 text-tiny transition"
              :class="
                models.includes(suggestion)
                  ? 'border-accent text-accent'
                  : 'border-divider text-secondaryLight hover:text-secondaryDark'
              "
              :aria-pressed="models.includes(suggestion)"
              @click="toggleModel(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>

          <HoppSmartInput
            v-model="modelsInput"
            :placeholder="modelsPlaceholder"
          />
          <p class="text-tiny text-secondaryLight">
            {{
              selectedPreset?.suggestedModels.length
                ? t('ai_providers.models_help_suggestions')
                : t('ai_providers.models_help')
            }}
          </p>
        </div>

        <div v-if="models.length" class="space-y-2">
          <label for="default-model" class="font-semibold text-secondaryDark">
            {{ t('ai_providers.default_model') }}
          </label>

          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => modelActions?.focus()"
          >
            <HoppSmartSelectWrapper>
              <input
                id="default-model"
                :value="defaultModel"
                readonly
                class="flex flex-1 w-full pl-4 pr-8 py-2 bg-transparent border rounded cursor-pointer border-divider"
              />
            </HoppSmartSelectWrapper>

            <template #content="{ hide }">
              <div
                ref="modelActions"
                tabindex="0"
                role="menu"
                class="flex flex-col focus:outline-none"
                @keyup.escape="hide"
              >
                <HoppSmartItem
                  v-for="model in models"
                  :key="model"
                  :label="model"
                  :title="model"
                  :icon="model === defaultModel ? IconCircleDot : IconCircle"
                  :active="model === defaultModel"
                  :aria-selected="model === defaultModel"
                  @click="
                    () => {
                      defaultModel = model;
                      hide();
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </div>

        <div
          v-if="testResults"
          class="space-y-1 rounded border border-divider p-3"
        >
          <div
            class="text-tiny font-semibold"
            :class="failedCount ? 'text-red-500' : 'text-green-500'"
          >
            {{
              failedCount
                ? t('ai_providers.test_some_failed', {
                    failed: failedCount,
                    count: testResults.length,
                  })
                : t('ai_providers.test_all_passed', {
                    count: testResults.length,
                  })
            }}
          </div>

          <div
            v-for="result in testResults"
            :key="result.model"
            class="flex items-start gap-2 text-tiny"
          >
            <icon-lucide-check
              v-if="result.ok"
              class="mt-0.5 h-3 w-3 shrink-0 text-green-500"
            />
            <icon-lucide-x
              v-else
              class="mt-0.5 h-3 w-3 shrink-0 text-red-500"
            />

            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <span
                  class="truncate text-secondaryDark"
                  :title="result.model"
                  >{{ result.model }}</span
                >
                <span class="shrink-0 text-secondaryLight"
                  >{{ result.latencyMs }} ms</span
                >
              </div>
              <div v-if="!result.ok" class="text-secondaryLight">
                {{ reasonLabel(result.reason) }}
              </div>
              <!-- The provider's own words, already stripped of the key. -->
              <div
                v-if="result.detail"
                class="break-words text-secondaryLight opacity-75"
              >
                {{ result.detail }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-x-2">
        <HoppButtonPrimary
          :loading="loading"
          filled
          outline
          :label="t('action.save')"
          @click="save"
        />

        <HoppButtonSecondary
          :loading="testing"
          :label="
            testing
              ? t('ai_providers.test_running')
              : t('ai_providers.test_connection')
          "
          outline
          filled
          @click="test"
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
import { VNodeRef, computed, ref, watch } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { labelForPreset, logoForPreset } from '~/helpers/aiProviderLogos';
import {
  AiProviderConnectionsQuery,
  AiProviderPresetsQuery,
  TestAiProviderConnectionMutation,
} from '~/helpers/backend/graphql';

import IconCircle from '~icons/lucide/circle';
import IconCircleDot from '~icons/lucide/circle-dot';
import IconEye from '~icons/lucide/eye';
import IconEyeOff from '~icons/lucide/eye-off';

type Connection = AiProviderConnectionsQuery['aiProviderConnections'][number];
type Preset = AiProviderPresetsQuery['aiProviderPresets'][number];
type TestResult =
  TestAiProviderConnectionMutation['testAIProviderConnection'][number];

export type ConnectionTestValues = {
  id: string | null;
  preset: string;
  baseURL: string | null;
  apiKey: string | null;
  models: string[];
};

export type ConnectionFormValues = {
  label: string;
  preset: string;
  baseURL: string | null;
  /** Null means "keep the stored key" — an edit that is not a rotation. */
  apiKey: string | null;
  models: string[];
  defaultModel: string;
  enabled: boolean;
  isDefault: boolean;
};

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  presets: Preset[];
  connection: Connection | null;
  loading: boolean;
  testing: boolean;
  testResults: TestResult[] | null;
}>();

const emit = defineEmits<{
  (e: 'hide-modal'): void;
  (e: 'save-connection', values: ConnectionFormValues): void;
  (e: 'test-connection', values: ConnectionTestValues): void;
}>();

const presetActions = ref<VNodeRef | null>(null);
const modelActions = ref<VNodeRef | null>(null);

const isEditing = computed(() => !!props.connection);

const label = ref(props.connection?.label ?? '');
const preset = ref(props.connection?.preset ?? props.presets[0]?.name ?? '');
const baseURL = ref(props.connection?.baseURL ?? '');
const apiKey = ref('');
const maskKey = ref(true);
const modelsInput = ref((props.connection?.models ?? []).join(', '));
const defaultModel = ref(props.connection?.defaultModel ?? '');
const enabled = ref(props.connection?.enabled ?? true);
const isDefault = ref(props.connection?.isDefault ?? false);

const models = computed(() => {
  const seen = new Set<string>();
  return modelsInput.value
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model && !seen.has(model) && seen.add(model));
});

// The default has to be one the connection actually offers, and the backend
// rejects it otherwise, so follow the list as it is edited.
watch(models, (list) => {
  if (!list.includes(defaultModel.value)) defaultModel.value = list[0] ?? '';
});

// The preset list loads alongside the connection list, so the form can open
// before it arrives; without this the provider field would sit empty and the
// server would reject the save.
watch(
  () => props.presets,
  (list) => {
    if (!preset.value) preset.value = list[0]?.name ?? '';
  },
  { immediate: true },
);

const toggleModel = (name: string) => {
  const next = models.value.includes(name)
    ? models.value.filter((model) => model !== name)
    : [...models.value, name];
  modelsInput.value = next.join(', ');
};

const selectedPreset = computed(() =>
  props.presets.find((option) => option.name === preset.value),
);

/**
 * The example shown in the models field, drawn from the chosen preset.
 *
 * Two of the preset's own suggestions, so the example demonstrates both a real
 * id and the comma separation. Presets whose ids only the operator knows —
 * Azure deployment names, a local runtime's catalogue, Bedrock's region
 * profiles — carry no suggestions, and get a prompt rather than an invented id.
 */
const modelsPlaceholder = computed(() => {
  const suggested = selectedPreset.value?.suggestedModels ?? [];
  return suggested.length
    ? t('ai_providers.models_placeholder', {
        models: suggested.slice(0, 2).join(', '),
      })
    : t('ai_providers.models_placeholder_any');
});

const baseURLRequired = computed(
  () => selectedPreset.value?.requiresBaseURL ?? false,
);

const baseURLPlaceholder = computed(
  () =>
    selectedPreset.value?.baseURLHint ??
    selectedPreset.value?.defaultBaseURL ??
    '',
);

/**
 * Guards shared by save and test, so a connection can never be testable but
 * unsaveable (or the reverse). Toasts the first problem and returns false.
 */
const isFormUsable = (): boolean => {
  if (!label.value.trim()) {
    toast.error(t('ai_providers.invalid_label'));
    return false;
  }
  if (!models.value.length) {
    toast.error(t('ai_providers.invalid_models'));
    return false;
  }
  // Only a new connection needs a key; an edit left blank keeps the stored one.
  if (!isEditing.value && !apiKey.value.trim()) {
    toast.error(t('ai_providers.invalid_key'));
    return false;
  }
  if (baseURLRequired.value && !baseURL.value.trim()) {
    toast.error(t('ai_providers.invalid_base_url'));
    return false;
  }
  return true;
};

const test = () => {
  if (!isFormUsable()) return;

  // The form wins over the stored row: the point is to prove what is about to
  // be saved, not what was saved last time.
  emit('test-connection', {
    id: props.connection?.id ?? null,
    preset: preset.value,
    baseURL: baseURL.value.trim() || null,
    apiKey: apiKey.value.trim() || null,
    models: models.value,
  });
};

const save = () => {
  if (!isFormUsable()) return;

  emit('save-connection', {
    label: label.value.trim(),
    preset: preset.value,
    baseURL: baseURL.value.trim() || null,
    apiKey: apiKey.value.trim() || null,
    models: models.value,
    defaultModel: defaultModel.value,
    enabled: enabled.value,
    isDefault: isDefault.value,
  });
};

const failedCount = computed(
  () => props.testResults?.filter((r) => !r.ok).length ?? 0,
);

const reasonLabel = (reason: string | null | undefined) =>
  t(`ai_providers.test_reason_${reason ?? 'unknown'}`);

const hideModal = () => emit('hide-modal');
</script>
