<template>
  <SmartTabs styles="sticky bg-primary z-10 top-0" vertical>
    <SmartTab
      :id="'history'"
      icon="clock"
      :label="`${$t('tab.history')}`"
      :selected="true"
    >
      <History ref="historyComponent" :page="'rest'" />
    </SmartTab>
    <SmartTab
      :id="'collections'"
      icon="folder"
      :label="`${$t('tab.collections')}`"
    >
      <Collections />
    </SmartTab>
    <SmartTab :id="'env'" icon="layers" :label="`${$t('environment.title')}`">
      <Environments />
    </SmartTab>
  </SmartTabs>
</template>
