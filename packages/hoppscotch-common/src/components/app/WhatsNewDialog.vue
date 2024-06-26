<template>
  <div class="whats-new">
    <p>
      {{ t("app.updated_text", { version: version }) }}
    </p>
    <p>
      <button
        style="display: flex; align-items: center; gap: 5px"
        @click="openWhatsNew"
      >
        {{ t("app.see_whats_new") }}
        <span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.24503 7.13139L3.60582 6.49929L5.82528 4.27983H0.25V3.35653H5.82528L3.60582 1.14062L4.24503 0.504971L7.55824 3.81818L4.24503 7.13139Z"
              fill="#868821"
            />
          </svg>
        </span>
      </button>
    </p>
    <button class="headlessClose" @click="$emit('closeToast')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M2.96967 2.96967C3.26256 2.67678 3.73744 2.67678 4.03033 2.96967L8 6.939L11.9697 2.96967C12.2626 2.67678 12.7374 2.67678 13.0303 2.96967C13.3232 3.26256 13.3232 3.73744 13.0303 4.03033L9.061 8L13.0303 11.9697C13.2966 12.2359 13.3208 12.6526 13.1029 12.9462L13.0303 13.0303C12.7374 13.3232 12.2626 13.3232 11.9697 13.0303L8 9.061L4.03033 13.0303C3.73744 13.3232 3.26256 13.3232 2.96967 13.0303C2.67678 12.7374 2.67678 12.2626 2.96967 11.9697L6.939 8L2.96967 4.03033C2.7034 3.76406 2.6792 3.3474 2.89705 3.05379L2.96967 2.96967Z"
        ></path>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { platform } from "~/platform"

const t = useI18n()

// types
const props = defineProps<{
  notesUrl: string
  version: string
}>()

const openWhatsNew = () => {
  if (props.notesUrl) platform.io.openExternalLink(props.notesUrl)
}
</script>

<style scoped>
.whats-new {
  border: 1px solid #bcb78b;
  background-color: #feffd2;
  padding: 1rem;
  position: relative;
  border-radius: 0.5rem;
  width: 300px;
}
.whats-new p {
  font-size: 0.8rem;
  color: #7e7103;
}
.whats-new a {
  margin-top: 10px;
  font-size: 0.7rem;
  color: #868821;
}
.headlessClose {
  position: absolute;
  cursor: pointer;
  top: 6px;
  height: 24px;
  width: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  right: 6px;
  color: var(--gray10);
  padding: 0;
  background: transparent;
  border: none;
  transition: color 200ms;
}

.headlessClose:hover {
  color: var(--gray12);
}
</style>
