<template>
  <HoppSmartModal
    dialog
    :title="
      isEditing
        ? t('ai_providers.skill_edit_title')
        : t('ai_providers.skill_new_title')
    "
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="font-semibold text-secondaryDark">
            {{ t('ai_providers.skill_slug') }}
          </label>
          <HoppSmartInput
            v-model="slug"
            placeholder="e.g., debug-request"
            :disabled="isEditing"
          />
          <p class="text-tiny text-secondaryLight">
            {{ t('ai_providers.skill_slug_help', { slug: preview }) }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-secondaryDark">
            {{ t('ai_providers.skill_title') }}
          </label>
          <HoppSmartInput v-model="title" placeholder="e.g., Debug request" />
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-secondaryDark">
            {{ t('ai_providers.skill_description') }}
          </label>
          <HoppSmartInput
            v-model="description"
            :placeholder="t('ai_providers.skill_description_placeholder')"
          />
        </div>

        <div class="space-y-2">
          <label for="skill-prompt" class="font-semibold text-secondaryDark">
            {{ t('ai_providers.skill_prompt') }}
          </label>
          <textarea
            id="skill-prompt"
            v-model="prompt"
            rows="6"
            :placeholder="t('ai_providers.skill_prompt_placeholder')"
            class="min-w-0 w-full resize-y whitespace-pre-wrap [overflow-wrap:anywhere] rounded border border-divider bg-primaryLight px-3 py-2 text-secondaryDark placeholder:text-secondaryLight focus:outline-none focus:border-accent"
          ></textarea>
          <p class="text-tiny text-secondaryLight">
            {{ t('ai_providers.skill_prompt_help') }}
          </p>
        </div>

        <HoppSmartToggle :on="enabled" @change="enabled = !enabled">
          {{ t('ai_providers.skill_enabled') }}
        </HoppSmartToggle>
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
          :label="t('action.cancel')"
          outline
          filled
          @click="emit('hide-modal')"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { AiSkillsQuery } from '~/helpers/backend/graphql';

type Skill = AiSkillsQuery['aiSkills'][number];

export type SkillFormValues = {
  id: string | null;
  slug: string;
  title: string;
  description: string;
  prompt: string;
  enabled: boolean;
};

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  skill: Skill | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'hide-modal'): void;
  (e: 'save-skill', values: SkillFormValues): void;
}>();

const isEditing = computed(() => !!props.skill);

const slug = ref(props.skill?.slug ?? '');
const title = ref(props.skill?.title ?? '');
const description = ref(props.skill?.description ?? '');
const prompt = ref(props.skill?.prompt ?? '');
const enabled = ref(props.skill?.enabled ?? true);

const preview = computed(() => normalizedSlug.value || 'debug-request');

// The server lowercases and rejects anything outside [a-z0-9-]; normalising
// here means the admin sees what will be stored rather than being corrected
// after the fact.
const normalizedSlug = computed(() =>
  slug.value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''),
);

const save = () => {
  if (!normalizedSlug.value) {
    toast.error(t('ai_providers.skill_invalid_slug'));
    return;
  }
  if (!title.value.trim() || !description.value.trim()) {
    toast.error(t('ai_providers.skill_incomplete'));
    return;
  }
  if (!prompt.value.trim()) {
    toast.error(t('ai_providers.skill_no_prompt'));
    return;
  }

  emit('save-skill', {
    id: props.skill?.id ?? null,
    slug: normalizedSlug.value,
    title: title.value.trim(),
    description: description.value.trim(),
    prompt: prompt.value.trim(),
    enabled: enabled.value,
  });
};
</script>
