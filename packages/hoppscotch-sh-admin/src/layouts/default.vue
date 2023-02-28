<template>
  <div class="flex h-screen bg-gray-200 font-roboto">
    <AppSidebar />

    <div class="flex-1 flex flex-col overflow-hidden">
      <AppHeader />

      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-primary">
        <div class="container mx-auto px-6 py-8">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>
