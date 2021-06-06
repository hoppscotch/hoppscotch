import firebase from "firebase/app"
import "firebase/firestore"
import "firebase/auth"
import { ReplaySubject } from "rxjs"
import { applySettingFB, settingsStore } from "~/newstore/settings"
import {
  restHistoryStore,
  setRESTHistoryEntries,
  graphqlHistoryStore,
  setGraphqlHistoryEntries,
  HISTORY_LIMIT,
} from "~/newstore/history"
import {
  restCollectionStore,
  setRESTCollections,
  graphqlCollectionStore,
  setGraphqlCollections,
} from "~/newstore/collections"
import { environments$, replaceEnvironments } from "~/newstore/environments"

// Initialize Firebase, copied from cloud console
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

export const authProviders = {
  google: () => new firebase.auth.GoogleAuthProvider(),
  github: () => new firebase.auth.GithubAuthProvider(),
}

export class FirebaseInstance {
  constructor(fbapp, authProviders) {
    this.app = fbapp
    this.authProviders = authProviders

    this.usersCollection = this.app.firestore().collection("users")

    this.currentUser = null
    this.idToken = null
    this.currentFeeds = []
    this.currentSettings = []

    this.currentUser$ = new ReplaySubject(1)
    this.idToken$ = new ReplaySubject(1)

    let loadedSettings = false
    let loadedRESTHistory = false
    let loadedGraphqlHistory = false
    let loadedRESTCollections = false
    let loadedGraphqlCollections = false
    let loadedEnvironments = false

    graphqlCollectionStore.subject$.subscribe(({ state }) => {
      if (
        loadedGraphqlCollections &&
        this.currentUser &&
        settingsStore.value.syncCollections
      ) {
        this.writeCollections(state, "collectionsGraphql")
      }
    })

    restCollectionStore.subject$.subscribe(({ state }) => {
      if (
        loadedRESTCollections &&
        this.currentUser &&
        settingsStore.value.syncCollections
      ) {
        this.writeCollections(state, "collections")
      }
    })

    restHistoryStore.dispatches$.subscribe((dispatch) => {
      if (
        loadedRESTHistory &&
        this.currentUser &&
        settingsStore.value.syncHistory
      ) {
        if (dispatch.dispatcher === "addEntry") {
          this.writeHistory(dispatch.payload.entry)
        } else if (dispatch.dispatcher === "deleteEntry") {
          this.deleteHistory(dispatch.payload.entry)
        } else if (dispatch.dispatcher === "clearHistory") {
          this.clearHistory()
        } else if (dispatch.dispatcher === "toggleStar") {
          this.toggleStar(dispatch.payload.entry)
        }
      }
    })

    graphqlHistoryStore.dispatches$.subscribe((dispatch) => {
      if (
        loadedGraphqlHistory &&
        this.currentUser &&
        settingsStore.value.syncHistory
      ) {
        if (dispatch.dispatcher === "addEntry") {
          this.writeGraphqlHistory(dispatch.payload.entry)
        } else if (dispatch.dispatcher === "deleteEntry") {
          this.deleteGraphqlHistory(dispatch.payload.entry)
        } else if (dispatch.dispatcher === "clearHistory") {
          this.clearGraphqlHistory()
        } else if (dispatch.dispatcher === "toggleStar") {
          this.toggleGraphqlHistoryStar(dispatch.payload.entry)
        }
      }
    })

    settingsStore.dispatches$.subscribe((dispatch) => {
      if (this.currentUser && loadedSettings) {
        if (dispatch.dispatcher === "bulkApplySettings") {
          Object.keys(dispatch.payload).forEach((key) => {
            this.writeSettings(key, dispatch.payload[key])
          })
        } else if (dispatch.dispatcher !== "applySettingFB") {
          this.writeSettings(
            dispatch.payload.settingKey,
            settingsStore.value[dispatch.payload.settingKey]
          )
        }
      }
    })

    environments$.subscribe((envs) => {
      if (this.currentUser && loadedEnvironments) {
        this.writeEnvironments(envs)
      }
    })

    this.app.auth().onIdTokenChanged((user) => {
      if (user) {
        user.getIdToken().then((token) => {
          this.idToken = token
          this.idToken$.next(token)
        })
      } else {
        this.idToken = null
        this.idToken$.next(null)
      }
    })

    this.app.auth().onAuthStateChanged((user) => {
      this.currentUser$.next(user)

      if (user) {
        this.currentUser = user

        this.currentUser.providerData.forEach((profile) => {
          const us = {
            updatedOn: new Date(),
            provider: profile.providerId,
            name: profile.displayName,
            email: profile.email,
            photoUrl: profile.photoURL,
            uid: profile.uid,
          }
          this.usersCollection
            .doc(this.currentUser.uid)
            .set(us, { merge: true })
            .catch((e) => console.error("error updating", us, e))
        })

        this.usersCollection.doc(this.currentUser.uid).onSnapshot((doc) => {
          this.currentUser.provider = doc.data().provider
          this.currentUser.accessToken = doc.data().accessToken
        })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("feeds")
          .orderBy("createdOn", "desc")
          .onSnapshot((feedsRef) => {
            const feeds = []
            feedsRef.forEach((doc) => {
              const feed = doc.data()
              feed.id = doc.id
              feeds.push(feed)
            })
            this.currentFeeds = feeds
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("settings")
          .onSnapshot((settingsRef) => {
            const settings = []
            settingsRef.forEach((doc) => {
              const setting = doc.data()
              setting.id = doc.id
              settings.push(setting)
            })
            this.currentSettings = settings

            settings.forEach((e) => {
              if (e && e.name && e.value != null) {
                applySettingFB(e.name, e.value)
              }
            })

            loadedSettings = true
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("history")
          .orderBy("updatedOn", "desc")
          .limit(HISTORY_LIMIT)
          .onSnapshot((historyRef) => {
            const history = []

            historyRef.forEach((doc) => {
              const entry = doc.data()
              entry.id = doc.id
              history.push(entry)
            })

            setRESTHistoryEntries(history)

            loadedRESTHistory = true
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("graphqlHistory")
          .orderBy("updatedOn", "desc")
          .limit(HISTORY_LIMIT)
          .onSnapshot((historyRef) => {
            const history = []

            historyRef.forEach((doc) => {
              const entry = doc.data()
              entry.id = doc.id
              history.push(entry)
            })

            setGraphqlHistoryEntries(history)

            loadedGraphqlHistory = true
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("collections")
          .onSnapshot((collectionsRef) => {
            const collections = []
            collectionsRef.forEach((doc) => {
              const collection = doc.data()
              collection.id = doc.id
              collections.push(collection)
            })

            // Prevent infinite ping-pong of updates
            loadedRESTCollections = false

            // TODO: Wth is with collections[0]
            if (collections.length > 0) {
              setRESTCollections(collections[0].collection)
            }

            loadedRESTCollections = true
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("collectionsGraphql")
          .onSnapshot((collectionsRef) => {
            const collections = []
            collectionsRef.forEach((doc) => {
              const collection = doc.data()
              collection.id = doc.id
              collections.push(collection)
            })

            // Prevent infinite ping-pong of updates
            loadedGraphqlCollections = false

            // TODO: Wth is with collections[0]
            if (collections.length > 0) {
              setGraphqlCollections(collections[0].collection)
            }

            loadedGraphqlCollections = true
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("environments")
          .onSnapshot((environmentsRef) => {
            const environments = []
            environmentsRef.forEach((doc) => {
              const environment = doc.data()
              environment.id = doc.id
              environments.push(environment)
            })

            loadedEnvironments = false
            replaceEnvironments(environments)
            loadedEnvironments = true
          })
      } else {
        this.currentUser = null
      }
    })
  }

  async signInUserWithGoogle() {
    return await this.app.auth().signInWithPopup(this.authProviders.google())
  }

  async signInUserWithGithub() {
    return await this.app
      .auth()
      .signInWithPopup(this.authProviders.github().addScope("gist"))
  }

  async signInWithEmailAndPassword(email, password) {
    return await this.app.auth().signInWithEmailAndPassword(email, password)
  }

  async getSignInMethodsForEmail(email) {
    return await this.app.auth().fetchSignInMethodsForEmail(email)
  }

  async signOutUser() {
    if (!this.currentUser) throw new Error("No user has logged in")

    await this.app.auth().signOut()
    this.currentUser = null
  }

  async writeFeeds(message, label) {
    const dt = {
      createdOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      message,
      label,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("feeds")
        .add(dt)
    } catch (e) {
      console.error("error inserting", dt, e)
      throw e
    }
  }

  async deleteFeed(id) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("feeds")
        .doc(id)
        .delete()
    } catch (e) {
      console.error("error deleting", id, e)
      throw e
    }
  }

  async writeSettings(setting, value) {
    const st = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      name: setting,
      value,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("settings")
        .doc(setting)
        .set(st)
    } catch (e) {
      console.error("error updating", st, e)
      throw e
    }
  }

  async writeHistory(entry) {
    const hs = entry

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("history")
        .add(hs)
    } catch (e) {
      console.error("error inserting", hs, e)
      throw e
    }
  }

  async writeGraphqlHistory(entry) {
    const hs = entry

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("graphqlHistory")
        .add(hs)
    } catch (e) {
      console.error("error inserting", hs, e)
      throw e
    }
  }

  async deleteHistory(entry) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("history")
        .doc(entry.id)
        .delete()
    } catch (e) {
      console.error("error deleting", entry, e)
      throw e
    }
  }

  async deleteGraphqlHistory(entry) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("graphqlHistory")
        .doc(entry.id)
        .delete()
    } catch (e) {
      console.error("error deleting", entry, e)
      throw e
    }
  }

  async clearHistory() {
    const { docs } = await this.usersCollection
      .doc(this.currentUser.uid)
      .collection("history")
      .get()

    await Promise.all(docs.map((e) => this.deleteHistory(e)))
  }

  async clearGraphqlHistory() {
    const { docs } = await this.usersCollection
      .doc(this.currentUser.uid)
      .collection("graphqlHistory")
      .get()

    await Promise.all(docs.map((e) => this.deleteGraphqlHistory(e)))
  }

  async toggleStar(entry) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("history")
        .doc(entry.id)
        .update({ star: !entry.star })
    } catch (e) {
      console.error("error deleting", entry, e)

      throw e
    }
  }

  async toggleGraphqlHistoryStar(entry) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("graphqlHistory")
        .doc(entry.id)
        .update({ star: !entry.star })
    } catch (e) {
      console.error("error deleting", entry, e)

      throw e
    }
  }

  async writeCollections(collection, flag) {
    const cl = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      collection,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection(flag)
        .doc("sync")
        .set(cl)
    } catch (e) {
      console.error("error updating", cl, e)
      throw e
    }
  }

  async writeEnvironments(environment) {
    const ev = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      environment,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("environments")
        .doc("sync")
        .set(ev)
    } catch (e) {
      console.error("error updating", ev, e)

      throw e
    }
  }

  async setProviderInfo(id, token) {
    const us = {
      updatedOn: new Date(),
      provider: id,
      accessToken: token,
    }
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .update(us)
        .catch((e) => console.error("error updating", us, e))
    } catch (e) {
      console.error("error updating", e)

      throw e
    }
  }
}

export const fb = new FirebaseInstance(
  firebase.initializeApp(firebaseConfig),
  authProviders
)
