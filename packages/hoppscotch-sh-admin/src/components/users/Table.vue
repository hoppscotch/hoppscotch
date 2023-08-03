<template>
  <table class="w-full">
    <thead>
      <tr class="text-secondary border-b border-dividerDark text-sm text-left">
        <th class="px-3 pb-3">{{ t('users.id') }}</th>
        <th class="px-3 pb-3">{{ t('users.name') }}</th>
        <th class="px-3 pb-3">{{ t('users.email') }}</th>
        <th class="px-3 pb-3">{{ t('users.date') }}</th>
        <th class="px-3 pb-3"></th>
      </tr>
    </thead>

    <tbody class="divide-y divide-divider">
      <tr
        v-for="user in usersList"
        :key="user.uid"
        class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
      >
        <td
          @click="$emit('goToUserDetails', user.uid)"
          class="py-2 px-3 max-w-30"
        >
          <div class="flex">
            <span class="truncate">
              {{ user.uid }}
            </span>
          </div>
        </td>

        <td @click="$emit('goToUserDetails', user.uid)" class="py-2 px-3">
          <div v-if="user.displayName" class="flex items-center space-x-3">
            <span>
              {{ user.displayName }}
            </span>
            <span
              v-if="user.isAdmin"
              class="text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
            >
              {{ t('users.admin') }}
            </span>
          </div>
          <div v-else class="flex items-center space-x-3">
            <span> {{ t('users.unnamed') }} </span>
            <span
              v-if="user.isAdmin"
              class="text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
            >
              {{ t('users.admin') }}
            </span>
          </div>
        </td>

        <td @click="$emit('goToUserDetails', user.uid)" class="py-2 px-3">
          <span>
            {{ user.email }}
          </span>
        </td>

        <td @click="$emit('goToUserDetails', user.uid)" class="py-2 px-3">
          <div class="flex items-center">
            <div class="flex flex-col">
              {{ getCreatedDate(user.createdOn) }}
              <div class="text-gray-400 text-tiny">
                {{ getCreatedTime(user.createdOn) }}
              </div>
            </div>
          </div>
        </td>

        <td>
          <div class="relative">
            <span>
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
                      v-if="!user.isAdmin"
                      :icon="IconUserCheck"
                      :label="'Make Admin'"
                      class="!hover:bg-emerald-600"
                      @click="
                        () => {
                          $emit('makeUserAdmin', user.uid);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      v-else
                      :icon="IconUserMinus"
                      :label="'Remove Admin Status'"
                      class="!hover:bg-emerald-600"
                      @click="
                        () => {
                          $emit('makeAdminToUser', user.uid);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      v-if="!user.isAdmin"
                      :icon="IconTrash"
                      :label="'Delete User'"
                      class="!hover:bg-red-600"
                      @click="
                        () => {
                          $emit('deleteUser', user.uid);
                          hide();
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </span>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import { format } from 'date-fns';
import { ref } from 'vue';
import IconTrash from '~icons/lucide/trash';
import IconUserMinus from '~icons/lucide/user-minus';
import IconUserCheck from '~icons/lucide/user-check';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';
import { UsersListQuery } from '~/helpers/backend/graphql';
import { TippyComponent } from 'vue-tippy';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

defineProps<{
  usersList: UsersListQuery['admin']['allUsers'];
}>();

defineEmits<{
  (event: 'goToUserDetails', uid: string): void;
  (event: 'makeUserAdmin', uid: string): void;
  (event: 'makeAdminToUser', uid: string): void;
  (event: 'deleteUser', uid: string): void;
}>();

// Get Proper Date Formats
const getCreatedDate = (date: string) => format(new Date(date), 'dd-MM-yyyy');
const getCreatedTime = (date: string) => format(new Date(date), 'hh:mm a');

// Template refs
const tippyActions = ref<TippyComponent | null>(null);
</script>

<style scoped>
.tippy-box[data-theme~='popover'] .tippy-content {
  padding: 0;
}
</style>
