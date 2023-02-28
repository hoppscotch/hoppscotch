<template>
  <h3 class="sm:px-6 p-4 text-3xl font-medium text-zinc-800 dark:text-gray-200">
    Create Team
  </h3>

  <div>
    <div>
      <div class="px-6 rounded-md">
        <form>
          <div class="flex mt-4 ml-10">
            <div>
              <label
                class="text-gray-800 dark:text-gray-200 mr-5 text-lg"
                for="username"
                >Name:
              </label>
              <input
                class="w-96 p-2 mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                type="text"
                placeholder="Enter Name"
              />
            </div>
          </div>
        </form>
        <div class="mt-6"></div>

        <div class="mx-10">
          <TeamsAddMembers />
        </div>

        <div class="mt-8"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
