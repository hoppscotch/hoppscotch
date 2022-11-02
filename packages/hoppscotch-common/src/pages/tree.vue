<template>
  <AppPaneLayout layout-id="http">
    <template #primary>
      <HttpRequest />
      <HttpRequestOptions />
    </template>
    <template #secondary>
      <HttpResponse />
    </template>
    <template #sidebar>
      <Test />
    </template>
  </AppPaneLayout>
</template>
