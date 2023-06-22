<template>
  <div
    class="overflow-hidden rounded-md border border-dividerDark shadow-md m-5"
  >
    <table class="w-full">
      <thead>
        <tr
          class="text-secondary border-b border-dividerDark text-sm text-left bg-primaryLight"
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
            v-for="data in item"
            @click="$emit('goToDetails', item)"
            class="max-w-40"
            :class="padding"
          >
            <div class="flex">
              <span class="truncate">
                {{ data }}
              </span>
            </div>
          </td>

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

          <slot name="action" :team="item"></slot>
          <!-- <td>
            <div class="relative">
              <tippy interactive trigger="click" theme="popover">
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :icon="IconMoreHorizontal"
                />
                <template #content="{ hide }">
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      :icon="IconTrash"
                      :label="'Delete Team'"
                      class="!hover:bg-red-600 w-full"
                      :class="itemStyle"
                      @click="$emit('id', item)"
                    />
                  </div>
                </template>
              </tippy>
            </div>
          </td> -->
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import IconTrash from '~icons/lucide/trash';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';

const props = defineProps<{
  xBorder: Boolean;
  list: [];
  headings: [];
  padding: string;
  itemStyle: string;
}>();

defineEmits<{
  (event: 'goToDetails', uid: string): void;
  (event: 'id', uid: string): void;
  (event: 'makeUserAdmin', uid: string): void;
  (event: 'makeAdminToUser', uid: string): void;
  (event: 'deleteUser', uid: string): void;
}>();
</script>

<style scoped>
.tippy-box[data-theme~='popover'] .tippy-content {
  padding: 0;
}
</style>
