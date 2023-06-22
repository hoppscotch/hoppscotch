<template>
  <div
    class="overflow-hidden rounded-md border border-dividerDark shadow-md m-5"
  >
    <table class="w-full">
      <thead class="bg-primaryLight">
        <tr
          class="text-secondary border-b border-dividerDark text-sm text-left"
        >
          <th v-for="title in headings" scope="col" class="px-6 py-3">
            {{ title }}
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-divider">
        <tr
          v-for="item in list"
          :key="item.id"
          class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
          :class="xBorder ? 'divide-x divide-divider' : ''"
        >
          <td
            v-for="(data, index) in item"
            :key="index"
            @click="$emit('goToDetails', item)"
            class="max-w-40"
            :class="padding"
          >
            <div class="flex items-center">
              <div class="flex flex-col">
                {{ data }}
                <!-- <div v-if="subdata" class="text-gray-400 text-tiny">
                  {{ subdata }}
                </div> -->
              </div>
            </div>
          </td>

          <!-- <td @click="$emit('goToUserDetails', user.uid)" class="py-2 px-3">
            <div class="flex items-center">
              <div class="flex flex-col">
                {{ getCreatedDate(user.createdOn) }}
                <div class="text-gray-400 text-tiny">
                  {{ getCreatedTime(user.createdOn) }}
                </div>
              </div>
            </div>
          </td> -->

          <!-- <td @click="$emit('goToUserDetails', user.uid)" class="py-2 px-3">
            <div v-if="user.displayName" class="flex items-center space-x-3">
              <span>
                {{ user.displayName }}
              </span>
              <span
                v-if="user.isAdmin"
                class="text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
              >
                Admin
              </span>
            </div>
            <div v-else class="flex items-center space-x-3">
              <span> (Unnamed user) </span>
              <span
                v-if="user.isAdmin"
                class="text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
              >
                Admin
              </span>
            </div>
          </td> -->

          <slot name="action" :item="item"></slot>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  xBorder: Boolean
  list: []
  headings: []
  padding: string
  itemStyle: string
  subtitle: {
    index: string
    label: string
  }
  hideCol: number
}>()

defineEmits<{
  (event: "goToDetails", uid: string): void
  (event: "id", uid: string): void
  (event: "makeUserAdmin", uid: string): void
  (event: "makeAdminToUser", uid: string): void
  (event: "deleteUser", uid: string): void
}>()
</script>

<style scoped>
.tippy-box[data-theme~="popover"] .tippy-content {
  padding: 0;
}
</style>
