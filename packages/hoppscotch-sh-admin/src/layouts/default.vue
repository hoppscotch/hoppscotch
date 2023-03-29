<template>
  <div class="flex h-screen bg-gray-200 font-roboto">
    <AppSidebar />

    <div class="flex-1 flex flex-col overflow-hidden">
      <AppHeader />

      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-primary">
        <div class="px-8 py-6">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>
