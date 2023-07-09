<template>
  <Story title="Table">
    <Variant title="Basic">
      <HoppSmartTable
        cell-styles="px-6 py-2"
        :list="list"
        :headings="headings"
      />
    </Variant>
    <Variant title="Badges">
      <HoppSmartTable
        cell-styles="px-6 py-2"
        :list="list"
        :headings="headings"
        badge-col-name="name"
        badge-name="Admin"
        :badge-row-indices="[0, 1]"
      />
    </Variant>
    <Variant title="Subtitles">
      <HoppSmartTable
        cell-styles="px-6 py-2"
        :list="list"
        :headings="headings"
        :subtitles="subtitles"
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

const subtitles = [
  {
    colName: "role",
    subtitle: "FE",
  },
]
</script>
