<script setup lang="ts">
const props = defineProps<{ shortCode: string }>()
</script>

<template>
  <div>
    <div v-if="!props.shortCode">
      not found
    </div>
    <!-- <div v-else>
      <Spinner />
      <p>Loading...</p>
    </div> -->
    <div v-else>
      <form class="flex space-x-2">
        <select id="method" required name="method" class="selectPrimary">
          <option value="GET">
            GET
          </option>
          <option value="POST">
            POST
          </option>
          <option value="PUT">
            PUT
          </option>
          <option value="DELETE">
            DELETE
          </option>
        </select>
        <input required type="text" placeholder="URL" class="inputPrimary">
        <button type="submit" class="buttonPrimary">
          Send
        </button>
      </form>
    </div>
  </div>
</template>
