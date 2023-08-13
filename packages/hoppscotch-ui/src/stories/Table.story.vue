<template>
  <Story title="Table">
    <Variant title="General">
      <HoppSmartTable :list="list" :headings="headings" />
    </Variant>
    <Variant title="Custom">
      <HoppSmartTable>
        <template #head>
          <th>ID</th>
          <th>Name</th>
          <th>Members</th>
          <th>Role</th>
        </template>
        <template #body>
          <tr>
            <td>123454</td>
            <td>Joel</td>
            <td>10</td>
            <td>Frontend Engineer</td>
          </tr>
          <tr>
            <td>123456</td>
            <td>Anwar</td>
            <td>12</td>
            <td>Frontend Engineer</td>
          </tr>
        </template>
      </HoppSmartTable>
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { HoppSmartTable } from "../components/smart"

// Table Headings
const headings = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "members", label: "Members" },
  { key: "role", label: "Role" },
]

const list = [
  {
    id: "123455",
    name: "Joel",
    members: 10,
    role: "Frontend Engineer",
  },
  {
    id: "123456",
    name: "Anwar",
    members: 12,
    role: "Frontend Engineer",
  },
]
</script>
