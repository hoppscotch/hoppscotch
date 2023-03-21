<template>
  <div class="flex justify-between">
    <h3 class="mt-10 text-2xl justify-start font-medium text-gray-200">
      Members
    </h3>
    <div class="mt-8 ml-2">
      <button
        @click="addNewMember"
        class="px-4 py-2 justify-right text-gray-200 bg-emerald-900 rounded-md hover:bg-emerald-700 focus:outline-none focus:bg-emerald-800"
      >
        Add New
      </button>
    </div>
  </div>
  <div>
    <div
      v-for="(member, i) in members"
      :key="i"
      class="mt-3 flex justify-center"
    >
      <input
        type="text"
        placeholder="Enter email"
        v-model="member.name"
        class="bg-primaryDark p-2 border-primaryLight w-90 focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
      />
      <select
        v-model="member.role"
        class="bg-primaryDark ml-0.5 p-2 pr-3 focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
      >
        <option value="owner">Owner</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
      <div
        class="bg-primaryDark flex items-center ml-0.5 border-primaryLight px-2 text-red-600 focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
      >
        <span class="flex" @click="deleteMemberRow(i)">
          <icon-lucide-trash />
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const members = reactive([
  {
    name: '',
    role: 'owner',
  },
]);

const addNewMember = () => {
  members.push({
    name: '',
    role: 'admin',
  });
};

const deleteMemberRow = (index: number) => {
  members.splice(index, 1);
};
</script>
