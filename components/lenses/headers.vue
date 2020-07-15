<template>
  <div>
    <ul v-for="(value, key) in headers" :key="key">
      <li>
        <input :value="`${key} → ${value}`" :name="key" class="bg-color" readonly />
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    headers: {},
  },
}
</script>
