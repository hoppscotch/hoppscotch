<template>
  <div class="sm:px-6 p-4">
    <h3 class="text-3xl font-medium text-gray-800 dark:text-gray-200 mb-6">
      Dashboard
    </h3>

    <div class="mt-4">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="w-full">
          <div
            class="flex items-center px-5 py-6 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-sm"
          >
            <icon-lucide-user-cog class="text-2xl text-emerald-500" />

            <div class="mx-5">
              <h4
                class="text-2xl font-semibold text-gray-700 dark:text-gray-200"
              >
                1000
              </h4>
              <div class="text-gray-600 dark:text-gray-400">Total Users</div>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div
            class="flex items-center px-5 py-6 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-sm"
          >
            <icon-lucide-users class="text-2xl text-pink-400" />

            <div class="mx-5">
              <h4
                class="text-2xl font-semibold text-gray-700 dark:text-gray-200"
              >
                200
              </h4>
              <div class="text-gray-600 dark:text-gray-400">Total Teams</div>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div
            class="flex items-center px-5 py-6 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-sm"
          >
            <icon-lucide-lock class="text-2xl text-cyan-400" />

            <div class="mx-5">
              <h4
                class="text-2xl font-semibold text-gray-700 dark:text-gray-200"
              >
                20
              </h4>
              <div class="text-gray-600 dark:text-gray-400">Total Roles</div>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div
            class="flex items-center px-5 py-6 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-sm"
          >
            <icon-lucide-line-chart class="text-2xl text-orange-400" />

            <div class="mx-5">
              <h4
                class="text-2xl font-semibold text-gray-700 dark:text-gray-200"
              >
                215
              </h4>
              <div class="text-gray-600 dark:text-gray-400">
                Total Collections
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8"></div>
  </div>
</template>
