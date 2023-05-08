/* eslint-disable no-restricted-globals, no-restricted-syntax */

// import { clone, assign, isEmpty } from "lodash-es"
// import {
//   translateToNewRESTCollection,
//   translateToNewGQLCollection,
//   Environment,
// } from "@hoppscotch/data"
// import {
//   settingsStore,
//   bulkApplySettings,
//   defaultSettings,
//   applySetting,
//   HoppAccentColor,
//   HoppBgColor,
// } from "./settings"
// import {
//   restHistoryStore,
//   graphqlHistoryStore,
//   setRESTHistoryEntries,
//   setGraphqlHistoryEntries,
//   translateToNewRESTHistory,
//   translateToNewGQLHistory,
// } from "./history"
// import {
//   restCollectionStore,
//   graphqlCollectionStore,
//   setGraphqlCollections,
//   setRESTCollections,
// } from "./collections"
// import {
//   replaceEnvironments,
//   environments$,
//   addGlobalEnvVariable,
//   setGlobalEnvVariables,
//   globalEnv$,
//   setSelectedEnvironmentIndex,
//   selectedEnvironmentIndex$,
// } from "./environments"
// import { WSRequest$, setWSRequest } from "./WebSocketSession"
// import { SIORequest$, setSIORequest } from "./SocketIOSession"
// import { SSERequest$, setSSERequest } from "./SSESession"
// import { MQTTRequest$, setMQTTRequest } from "./MQTTSession"
// import { bulkApplyLocalState, localStateStore } from "./localstate"
import { StorageLike } from '@vueuse/core';
// import {
//   loadTabsFromPersistedState,
//   persistableTabState,
// } from "~/helpers/rest/tab"

/**
 * Gets a value in LocalStorage.
 *
 * NOTE: Use LocalStorage to only store non-reactive simple data
 * For more complex data, use stores and connect it to localpersistence
 */
export function getLocalConfig(name: string) {
  return window.localStorage.getItem(name);
}

/**
 * Sets a value in LocalStorage.
 *
 * NOTE: Use LocalStorage to only store non-reactive simple data
 * For more complex data, use stores and connect it to localpersistence
 */
export function setLocalConfig(key: string, value: string) {
  window.localStorage.setItem(key, value);
}

/**
 * Clear config value in LocalStorage.
 * @param key Key to be cleared
 */
export function removeLocalConfig(key: string) {
  window.localStorage.removeItem(key);
}

/**
 * The storage system we are using in the application.
 * NOTE: This is a placeholder for being used in app.
 * This entire redirection of localStorage is to allow for
 * not refactoring the entire app code when we refactor when
 * we are building the native (which may lack localStorage,
 * or use a custom system)
 */
export const hoppLocalConfigStorage: StorageLike = localStorage;
