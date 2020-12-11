<template>
  <div>
    <p v-for="(value, key) in headers" :key="key">
      <input :value="`${key} → ${value}`" :name="key" class="bg-transparent" readonly />
    </p>
  </div>
</template>

<script>
export default {
  props: {
    headers: {},
  },
}
</script>
