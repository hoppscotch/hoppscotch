<template>
  <div>
    <h3
      class="sm:px-6 p-4 text-3xl font-medium text-zinc-800 dark:text-gray-200"
    >
      Users
    </h3>

    <div class="flex flex-col">
      <div class="py-2 -my-2 overflow-x-auto sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-8">
        <div class="inline-block min-w-full overflow-hidden align-middle">
          <div class="sm:px-7 p-4">
            <div class="flex w-full items-center mb-7">
              <button
                class="inline-flex mr-3 items-center h-8 pl-2.5 pr-2 rounded-md shadow text-gray-700 dark:text-gray-400 dark:border-gray-800 border-2 border-gray-200 leading-none py-0"
              >
                Last 30 days
                <icon-lucide-chevron-down
                  class="w-4 ml-1.5 text-gray-400 dark:text-gray-600"
                />
              </button>

              <div class="relative">
                <button
                  @click="dropdownOpen = !dropdownOpen"
                  class="inline-flex items-center h-8 pl-2.5 pr-2 rounded-md shadow text-gray-700 dark:text-gray-400 dark:border-gray-800 border-2 border-gray-200 leading-none py-0"
                >
                  Filter by
                  <icon-lucide-chevron-down
                    class="w-4 ml-1.5 text-gray-400 dark:text-gray-600"
                  />
                </button>

                <div
                  v-show="dropdownOpen"
                  @click="dropdownOpen = false"
                  class="fixed inset-0 z-10 w-full h-full"
                ></div>

                <transition
                  enter-active-class="transition duration-150 ease-out transform"
                  enter-from-class="scale-95 opacity-0"
                  enter-to-class="scale-100 opacity-100"
                  leave-active-class="transition duration-150 ease-in transform"
                  leave-from-class="scale-100 opacity-100"
                  leave-to-class="scale-95 opacity-0"
                >
                  <div
                    v-show="dropdownOpen"
                    class="absolute left-0 z-20 w-48 mt-2 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-xl"
                  >
                    <button
                      href="#"
                      class="block w-full text-left rounded-md px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-emerald-700 hover:text-white"
                    >
                      Status
                    </button>
                  </div>
                </transition>
              </div>

              <Modal v-if="open" :button="button" :title="title">
                <template #title>
                  <p class="text-2xl font-bold">Invite User</p>
                </template>
                <template #content>
                  <div>
                    <div>
                      <div class="px-6 rounded-md">
                        <form>
                          <div class="my-4">
                            <div>
                              <label
                                class="text-gray-800 dark:text-gray-200"
                                for="emailAddress"
                                >Email Address</label
                              >
                              <input
                                class="w-full p-3 mt-3 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                                type="email"
                                v-model="email"
                                placeholder="Enter Email Address"
                              />
                            </div>
                          </div>
                          <div class="flex justify-end my-2 pt-3">
                            <button
                              @click="sendInvite"
                              class="px-4 py-2 font-medium tracking-wide text-white bg-emerald-700 rounded-md hover:bg-emerald-600 focus:outline-none"
                            >
                              Send Invite
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </template>
              </Modal>

              <button
                class="inline-flex items-center bg-zinc-700 h-8 ml-3 pl-2.5 pr-2 rounded-md shadow text-gray-200 dark:border-gray-800 border border-gray-200 leading-none py-0 hover:bg-emerald-700 focus:outline-none focus:bg-emerald-800"
              >
                <router-link :to="'/users/invited'">
                  Invited Users
                </router-link>
              </button>
              <div
                class="ml-auto text-gray-400 text-xs sm:inline-flex hidden items-center"
              >
                <span class="mr-3">Page 2 of 4</span>
                <button
                  class="inline-flex mr-2 items-center h-8 w-8 justify-center text-gray-400 rounded-md shadow border border-gray-200 dark:border-gray-800 leading-none py-0"
                >
                  <icon-lucide-chevron-left class="text-xl" />
                </button>

                <button
                  class="inline-flex items-center h-8 w-8 justify-center text-gray-400 rounded-md shadow border border-gray-200 dark:border-gray-800 leading-none py-0"
                >
                  <icon-lucide-chevron-right class="text-xl" />
                </button>
              </div>
            </div>
            <div>
              <table class="w-full text-left">
                <thead>
                  <tr
                    class="text-zinc-900 dark:text-gray-200 border-b border-gray-300 dark:border-gray-600 text-sm"
                  >
                    <th class="font-normal px-3 pt-0 pb-3"></th>
                    <th class="font-normal px-3 pt-0 pb-3">User ID</th>
                    <th class="font-normal px-3 pt-0 pb-3">Sign-In Method</th>
                    <th class="font-normal px-3 pt-0 pb-3 hidden md:table-cell">
                      Email
                    </th>
                    <th class="font-normal px-3 pt-0 pb-3">Status</th>
                    <th class="font-normal px-3 pt-0 pb-3">Date</th>
                  </tr>
                </thead>

                <tbody class="text-gray-600 dark:text-gray-300">
                  <tr
                    v-for="user in users"
                    @click="goToUser"
                    class="border-b border-gray-300 dark:border-gray-600 hover:bg-zinc-800 rounded-xl"
                  >
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          class="appearance-none bg-gray-600 checked:bg-emerald-600 rounded-md ml-3 w-5 h-5"
                          name="radio"
                        />
                      </label>
                    </td>
                    <td class="sm:p-3 py-2 px-1">
                      <div class="flex">
                        <span class="ml-3 truncate">
                          {{ user?.id }}
                        </span>
                      </div>
                    </td>
                    <td class="sm:p-3 py-2 px-1 0">
                      <div class="flex items-center">
                        {{ user?.signin }}
                      </div>
                    </td>
                    <td
                      class="sm:p-3 py-2 px-1 md:table-cell hidden text-sky-500 dark:text-sky-300"
                    >
                      {{ user?.email }}
                    </td>
                    <td class="sm:p-3 py-2 px-1 text-green-500">
                      {{ user?.status }}
                    </td>
                    <td class="sm:p-3 py-2 px-1">
                      <div class="flex items-center">
                        <div class="sm:flex hidden flex-col">
                          {{ user?.date }}
                          <div class="text-gray-400 text-xs">11:16 AM</div>
                        </div>
                        <button
                          class="w-8 h-8 inline-flex items-center justify-center text-gray-400 ml-auto"
                        >
                          <icon-lucide-more-horizontal />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '../../components/app/Modal.vue';

const open = ref(true);

const sendInvite = () => {
  open.value = false;
};

const router = useRouter();

const { fetching, data } = useQuery({
  query: `
    query {
      me {
        displayName
      }
    }
  `,
});

const goToUser = () => {
  router.push('/users/details');
};

const email = ref('');

type User = {
  id: string;
  signin: string;
  email: string;
  status: string;
  date: string;
};

const title = 'Invite User';
const button = 'Send Invite';
const dropdownOpen = ref(false);

const users: Array<User> = [
  {
    id: 'abc12',
    signin: 'Microsoft',
    email: 'joel@gmail.com',
    status: 'Active',
    date: '15-01-2023',
  },
  {
    id: 'zxc21',
    signin: 'Microsoft',
    email: 'andrew@gmail.com',
    status: 'Active',
    date: '15-01-2023',
  },
  {
    id: 'cadf4',
    signin: 'Microsoft',
    email: 'liyas@gmail.com',
    status: 'Active',
    date: '15-01-2023',
  },
];
</script>
