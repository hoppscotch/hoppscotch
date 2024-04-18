<template>
  <div
    class="border-animation relative p-[1px] rounded flex-1 self-stretch overflow-hidden flex items-center justify-center"
    :class="{
      'before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:aspect-square before:w-full before:absolute before:bg-':
        !HAS_OPENED_SPOTLIGHT,
    }"
    aria-hidden="true"
  >
    <button
      class="relative flex flex-1 cursor-text items-center justify-between self-stretch rounded bg-primaryDark px-2 text-secondaryLight transition hover:border-dividerDark hover:bg-primaryLight hover:text-secondary focus-visible:border-dividerDark focus-visible:bg-primaryLight focus-visible:text-secondary overflow-hidden"
      @click="
        () => {
          invokeAction('modals.search.toggle', undefined, 'mouseclick')
          !HAS_OPENED_SPOTLIGHT && toggleSetting('HAS_OPENED_SPOTLIGHT')
        }
      "
    >
      <span class="inline-flex flex-1 items-center">
        <icon-lucide-search class="svg-icons mr-2" />
        <span v-if="!HAS_OPENED_SPOTLIGHT" class="flex flex-1">
          {{ t("spotlight.phrases.try") }}
          <TransitionGroup tag="div" name="list" class="ml-1 relative">
            <span
              v-for="(phrase, index) in phraseToShow"
              :key="phrase.text"
              :data-index="index"
              class="truncate"
            >
              "{{ t(phrase.text) }}"
            </span>
          </TransitionGroup>
        </span>
        <template v-else>
          {{ t("app.search") }}
        </template>
      </span>
      <span class="flex space-x-1">
        <kbd class="shortcut-key">{{ getPlatformSpecialKey() }}</kbd>
        <kbd class="shortcut-key">K</kbd>
      </span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { watch, computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useSetting } from "~/composables/settings"
import { invokeAction } from "~/helpers/actions"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { toggleSetting } from "~/newstore/settings"

const t = useI18n()

const HAS_OPENED_SPOTLIGHT = useSetting("HAS_OPENED_SPOTLIGHT")

const phrases = ref([
  { text: "spotlight.phrases.import_collections", show: true },
  { text: "spotlight.phrases.create_environment", show: false },
  { text: "spotlight.phrases.create_workspace", show: false },
  { text: "spotlight.phrases.share_request", show: false },
])

let intervalId: ReturnType<typeof setTimeout> | null = null

//cycle through the phrases
const showNextPhrase = () => {
  let i = 0
  intervalId = setInterval(() => {
    phrases.value[i].show = false
    i++
    if (i >= phrases.value.length) {
      i = 0
    }
    phrases.value[i].show = true
  }, 3000)
}

const stopPhraseInterval = () => {
  if (intervalId) clearInterval(intervalId)
}

const phraseToShow = computed(() => {
  return phrases.value.filter((phrase) => phrase.show)
})

watch(
  HAS_OPENED_SPOTLIGHT,
  () => {
    !HAS_OPENED_SPOTLIGHT.value ? showNextPhrase() : stopPhraseInterval()
  },
  {
    immediate: true,
  }
)
</script>

<style>
/* Transition Classes */
.list-enter-active {
  transition: all 1s ease;
}
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
.list-leave-active {
  position: absolute;
}

/* Conic gradient */
.border-animation::before {
  background: conic-gradient(
    transparent 270deg,
    var(--accent-color),
    transparent
  );
  animation: rotate 4s linear infinite;
}

@keyframes rotate {
  from {
    transform: translate(-50%, -50%) scale(1.4) rotate(0turn);
  }

  to {
    transform: translate(-50%, -50%) scale(1.4) rotate(1turn);
  }
}
</style>
