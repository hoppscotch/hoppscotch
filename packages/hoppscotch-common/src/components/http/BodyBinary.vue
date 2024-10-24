<script setup lang="ts">
const index = 1

type BinaryBody = {
  contentType: "application/octet-stream"
  body: Blob | null
}

const emit = defineEmits<{
  (e: "update:modelValue", value: BinaryBody): void
}>()

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    emit("update:modelValue", {
      body: file,
      contentType: "application/octet-stream",
    })
  }
}
</script>
<template>
  <span>
    <label :for="`attachment${index}`" class="p-0">
      <input
        :id="`attachment${index}`"
        :name="`attachment${index}`"
        type="file"
        class="cursor-pointer p-1 text-tiny text-secondaryLight transition file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-primaryLight file:px-4 file:py-1 file:text-tiny file:text-secondary file:transition hover:text-secondaryDark hover:file:bg-primaryDark hover:file:text-secondaryDark"
        @change="handleFileChange"
      />
    </label>
  </span>
</template>
