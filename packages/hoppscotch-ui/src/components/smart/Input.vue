<template lang="">
  <div class="flex flex-col">
    <input
      v-model="input"
      :id="id"
      v-focus
      class="input floating-input"
      placeholder=" "
      type="text"
      autocomplete="off"
      @input.stop="onInput"
      @keyup.enter="onInput"
    />
    <label> {{ label }}</label>
  </div>

  <!-- <div>
    <form class="flex mt-2 md:max-w-sm" @submit.prevent="emit('submit')">
      <input
        :id="id"
        class="input"
        v-model="displayName"
        :placeholder="placeholder"
        type="text"
        autocomplete="off"
        required
      />
      <slot></slot>
    </form>
  </div> -->
</template>

<script setup lang="ts">
import { defineProps, ref, inject } from "vue"

const displayName = inject("input-text")
const emailAddress = inject("input-email")

defineProps({
  id: {
    type: String,
    default: "",
    required: false,
  },

  name: {
    type: String,
    default: "",
    required: false,
  },

  placeholder: {
    type: String,
    default: "",
    required: false,
  },

  inputType: {
    type: String,
  },

  label: {
    type: String,
    default: "",
    required: false,
  },

  styles: {
    type: String,
    default: "",
  },
})

const input = ref("")

const onInput = (e: Event) => {
  console.log(input.value)

  emit("sendInvite", input.value)
}

const emit = defineEmits<{
  (e: "submit"): void
  (e: "sendInvite", v: string): void
  (e: "input", v: string): void
}>()
</script>

<style lang=""></style>
