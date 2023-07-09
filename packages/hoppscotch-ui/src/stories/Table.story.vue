<template>
  <Story title="Table">
    <Variant title="Single">
      <HoppSmartTable
        cell-styles="px-6 py-2"
        :list="list"
        :headings="headings"
      />
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { HoppSmartTable } from "../components/smart"

const headings = ["UID", "Name", "Email", "Role"]

const list = [
  {
    uid: "123455",
    name: "Joel",
    email: "joel@gmail.com",
    role: "Frontend Engineer",
  },
  {
    uid: "123456",
    name: "Anwar",
    email: "anwar@gmail.com",
    role: "Frontend Engineer",
  },
]
</script>
