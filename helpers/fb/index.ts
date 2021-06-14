import firebase from "firebase"
import { initAuth } from "./auth"
import { initCollections } from "./collections"
import { initEnvironments } from "./environments"
import { initFeeds } from "./feeds"
import { initHistory } from "./history"
import { initSettings } from "./settings"

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID,
}

export function initializeFirebase() {
  firebase.initializeApp(firebaseConfig)

  initAuth()
  initSettings()
  initCollections()
  initHistory()
  initEnvironments()
  initFeeds()
}
